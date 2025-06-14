# Файл: app/services/chat_service.py
from sqlalchemy.ext.asyncio import AsyncSession
from typing import List, Dict, Any, Tuple, Optional
import datetime
import uuid
import traceback

from app.crud import crud_chat
from app.schemas import chat_schemas
from app.services import voidai_service
from app.db.models_db import Message as MessageModel
from app.core.config import AVAILABLE_MODELS_DICT, NON_STREAMING_MODELS_SET
from app.db.database import db_write_lock

class ChatServiceError(Exception):
    def __init__(self, message: str, error_type: Optional[str] = None, status_code: Optional[int] = None):
        self.message = message
        self.error_type = error_type or "service_error"
        self.status_code = status_code or 500
        super().__init__(self.message)

async def process_user_message_non_streaming(
    db: AsyncSession,
    chat_id: int,
    user_message: chat_schemas.MessageCreate,
    model_id: str,
    is_temporary: bool,
    history: Optional[List[Dict[str, str]]] = None,
    user_temp_id: Optional[str] = None
) -> Tuple[chat_schemas.Message, chat_schemas.Message]:
    """
    ОБРАБАТЫВАЕТ сообщение пользователя БЕЗ СТРИМИНГА.
    Вызывает voidai_service.get_ai_response.
    Сохраняет оба сообщения (user, assistant) в одной транзакции.
    Возвращает схемы Pydantic для обоих сообщений.
    """
    print(f"Chat Service (Non-Streaming): Начало обработки для чата {chat_id}, модель {model_id}")
    user_msg_schema: Optional[chat_schemas.Message] = None
    ai_msg_schema: Optional[chat_schemas.Message] = None
    now = datetime.datetime.now(datetime.timezone.utc)
    ai_temp_id = f"temp-{uuid.uuid4()}-assistant" if is_temporary else None
    if is_temporary and not user_temp_id: user_temp_id = f"temp-{uuid.uuid4()}-user"

    if not model_id:
        raise ChatServiceError("Не указана модель AI.", status_code=400, error_type="model_not_specified")
    if not is_temporary and chat_id <= 0:
        raise ChatServiceError("Внутренняя ошибка: ID постоянного чата <= 0.", status_code=500, error_type="internal_error")

    system_prompt_from_request: Optional[Dict[str, str]] = None
    request_history_without_system: List[Dict[str, str]] = []
    if history and history[0].get("role") == "system":
        system_prompt_from_request = history[0]
        request_history_without_system = history[1:]
    else:
        request_history_without_system = history or []

    async with db_write_lock:
        try:
            final_history_for_ai: List[Dict[str, str]] = []
            if system_prompt_from_request: final_history_for_ai.append(system_prompt_from_request)

            # Для обоих типов чатов используем переданную историю, если она есть
            if request_history_without_system:
                final_history_for_ai.extend(request_history_without_system)
                print(f"Chat Service (Non-Streaming): Используется переданная история: {len(request_history_without_system)} сообщений")
            elif not is_temporary:
                # Fallback: загружаем из БД только если история не передана (для обратной совместимости)
                chat_before_new_message = await crud_chat.get_chat(db=db, chat_id=chat_id)
                db_history_models = chat_before_new_message.messages if chat_before_new_message else []
                db_history_dicts = [{"role": msg.role, "content": msg.content} for msg in db_history_models]
                final_history_for_ai.extend(db_history_dicts)
                print(f"Chat Service (Non-Streaming): Загружена история из БД: {len(db_history_dicts)} сообщений")

            final_history_for_ai.append({"role": user_message.role, "content": user_message.content})
            print(f"Chat Service (Non-Streaming): Вызов AI для чата {chat_id}, модель {model_id}")

            ai_response_data = await voidai_service.get_ai_response(model=model_id, messages=final_history_for_ai)

            if "error_type" in ai_response_data:
                await db.rollback()
                error_type = ai_response_data.get("error_type", "unknown_ai_error")
                error_msg = ai_response_data.get("message", "Неизвестная ошибка от AI сервиса.")
                original_status_code = ai_response_data.get("status_code", 500)
                raise ChatServiceError(message=error_msg, error_type=error_type, status_code=original_status_code)

            ai_content = None
            try:
                choice = ai_response_data.get("choices", [{}])[0]
                message_data_from_ai = choice.get("message", {})
                ai_content = message_data_from_ai.get("content")
                finish_reason = choice.get("finish_reason")
                if ai_content is None:
                    raise ChatServiceError(f"Не удалось извлечь контент из ответа AI (причина: {finish_reason}).", status_code=500, error_type="content_extraction_error")
                elif not ai_content.strip():
                    print(f"Ошибка [Chat Service]: AI ({model_id}) вернул пустой ответ.")
                    raise ChatServiceError(f"Модель {model_id} выдала пустой ответ. Пожалуйста, попробуйте переформулировать ваш запрос или выберите другую модель.", status_code=500, error_type="empty_response")
            except (IndexError, KeyError, TypeError, ChatServiceError) as e:
                await db.rollback()
                raise ChatServiceError(f"Не удалось обработать структуру ответа от AI: {e}", status_code=500, error_type="response_parsing_error")
            except Exception as e:
                await db.rollback()
                raise ChatServiceError(f"Непредвиденная ошибка при обработке ответа AI: {e}", status_code=500, error_type="unknown_response_error")

            ai_message_to_create = chat_schemas.MessageCreate(role="assistant", content=ai_content)

            if not is_temporary:
                db_user_message_model = await crud_chat.create_message(db=db, message=user_message, chat_id=chat_id, is_temporary=False)
                db_ai_message_model = await crud_chat.create_message(db=db, message=ai_message_to_create, chat_id=chat_id, ai_model_name=model_id, is_temporary=False)
                await crud_chat.update_chat_timestamp(db=db, chat_id=chat_id)
                await db.commit()
                print(f"Chat Service (Non-Streaming): Сообщения сохранены, чат {chat_id} обновлен.")
                await db.refresh(db_user_message_model)
                await db.refresh(db_ai_message_model)
                user_msg_schema = chat_schemas.Message.model_validate(db_user_message_model)
                ai_msg_schema = chat_schemas.Message.model_validate(db_ai_message_model)
                user_msg_schema.temp_id = user_temp_id
                ai_msg_schema.temp_id = ai_temp_id
            else:
                user_msg_schema = chat_schemas.Message(id=None, chat_id=0, role=user_message.role, content=user_message.content, timestamp=now, ai_model_name=None, temp_id=user_temp_id)
                ai_msg_schema = chat_schemas.Message(id=None, chat_id=0, role="assistant", content=ai_content, timestamp=datetime.datetime.now(datetime.timezone.utc), ai_model_name=model_id, temp_id=ai_temp_id)

            if user_msg_schema is None or ai_msg_schema is None:
                 await db.rollback()
                 raise ChatServiceError("Внутренняя ошибка: Не удалось создать схемы сообщений для ответа.", status_code=500, error_type="schema_creation_error")

            return user_msg_schema, ai_msg_schema

        except ChatServiceError as e:
            await db.rollback()
            raise e
        except Exception as e:
            print(f"Chat Service (Non-Streaming): Непредвиденная ошибка внутри db_write_lock: {type(e).__name__} - {e}")
            traceback.print_exc()
            await db.rollback()
            raise ChatServiceError(f"Внутренняя ошибка сервиса: {e}", status_code=500)

async def prepare_and_save_user_message(
    db: AsyncSession,
    chat_id: int,
    user_message: chat_schemas.MessageCreate,
    is_temporary: bool,
    history: Optional[List[Dict[str, str]]] = None,
    user_temp_id: Optional[str] = None
) -> Tuple[chat_schemas.Message, List[Dict[str, str]]]:
    """
    Сохраняет сообщение пользователя (если чат постоянный).
    Подготавливает историю для передачи в AI (включая системный промпт).
    Возвращает Pydantic схему сохраненного/временного сообщения пользователя и историю для AI.
    НЕ ВЫЗЫВАЕТ AI.
    """
    print(f"Chat Service (Prepare Stream): Начало для чата {chat_id}")
    now = datetime.datetime.now(datetime.timezone.utc)
    if is_temporary and not user_temp_id: user_temp_id = f"temp-{uuid.uuid4()}-user"

    if not is_temporary and chat_id <= 0:
        raise ChatServiceError("Внутренняя ошибка: ID постоянного чата <= 0 для подготовки стрима.", status_code=500, error_type="internal_error")

    system_prompt_from_request: Optional[Dict[str, str]] = None
    request_history_without_system: List[Dict[str, str]] = []
    if history and history[0].get("role") == "system":
        system_prompt_from_request = history[0]
        request_history_without_system = history[1:]
    else:
        request_history_without_system = history or []

    user_msg_schema: Optional[chat_schemas.Message] = None
    final_history_for_ai: List[Dict[str, str]] = []

    async with db_write_lock:
        try:
            if not is_temporary:
                db_user_message_model = await crud_chat.create_message(db=db, message=user_message, chat_id=chat_id, is_temporary=False)
                await db.commit()
                print(f"Chat Service (Prepare Stream): Сообщение пользователя сохранено в чате {chat_id}.")
                await db.refresh(db_user_message_model)
                user_msg_schema = chat_schemas.Message.model_validate(db_user_message_model)
                user_msg_schema.temp_id = user_temp_id
            else:
                user_msg_schema = chat_schemas.Message(id=None, chat_id=0, role=user_message.role, content=user_message.content, timestamp=now, ai_model_name=None, temp_id=user_temp_id)

            if system_prompt_from_request: final_history_for_ai.append(system_prompt_from_request)
            
            # Для обоих типов чатов используем переданную историю, если она есть
            if request_history_without_system:
                final_history_for_ai.extend(request_history_without_system)
                print(f"Chat Service (Prepare Stream): Используется переданная история: {len(request_history_without_system)} сообщений")
            elif not is_temporary:
                # Fallback: загружаем из БД только если история не передана (для обратной совместимости)
                async with db.begin_nested(): # Используем вложенную транзакцию для чтения
                    chat_after_user_msg = await crud_chat.get_chat(db=db, chat_id=chat_id)
                    db_history_models = chat_after_user_msg.messages if chat_after_user_msg else []
                    db_history_dicts = [{"role": msg.role, "content": msg.content} for msg in db_history_models]
                    final_history_for_ai.extend(db_history_dicts)
                    print(f"Chat Service (Prepare Stream): Загружена история из БД: {len(db_history_dicts)} сообщений")
            
            # Для временного чата добавляем новое сообщение в историю
            if is_temporary:
                final_history_for_ai.append({"role": user_message.role, "content": user_message.content})

            if not user_msg_schema:
                raise ChatServiceError("Не удалось создать схему user_msg в prepare_and_save_user_message.")

            print(f"Chat Service (Prepare Stream): Подготовлено {len(final_history_for_ai)} сообщений для AI.")
            return user_msg_schema, final_history_for_ai

        except Exception as e:
            print(f"Chat Service (Prepare Stream): Ошибка: {type(e).__name__} - {e}")
            traceback.print_exc()
            await db.rollback()
            raise ChatServiceError(f"Ошибка подготовки стрима: {e}", status_code=500)

async def save_assistant_message(
    db: AsyncSession,
    chat_id: int,
    ai_content: str,
    model_id: str,
    ai_temp_id: Optional[str] = None
) -> chat_schemas.Message:
    """
    Сохраняет ПОЛНЫЙ ответ ассистента в БД после завершения стриминга.
    Обновляет таймстемп чата.
    Возвращает Pydantic схему сохраненного сообщения.
    """
    print(f"Chat Service (Save Stream): Сохранение ответа AI для чата {chat_id}, модель {model_id}")
    if chat_id <= 0: raise ValueError("chat_id должен быть > 0 для сохранения ответа ассистента.")
    if not ai_content or not ai_content.strip():
        print("Chat Service (Save Stream) ОШИБКА: Попытка сохранить пустой ответ AI.")
        raise ChatServiceError(f"Модель {model_id} выдала пустой ответ. Пожалуйста, попробуйте переформулировать ваш запрос или выберите другую модель.", status_code=500, error_type="empty_response")

    ai_message_to_create = chat_schemas.MessageCreate(role="assistant", content=ai_content)

    async with db_write_lock:
        try:
            db_ai_message_model = await crud_chat.create_message(
                db=db, message=ai_message_to_create, chat_id=chat_id,
                ai_model_name=model_id, is_temporary=False
            )
            await crud_chat.update_chat_timestamp(db=db, chat_id=chat_id)
            await db.commit()
            print(f"Chat Service (Save Stream): Ответ AI сохранен, чат {chat_id} обновлен.")
            await db.refresh(db_ai_message_model)
            ai_msg_schema = chat_schemas.Message.model_validate(db_ai_message_model)
            ai_msg_schema.temp_id = ai_temp_id
            return ai_msg_schema
        except Exception as e:
            print(f"Chat Service (Save Stream): Ошибка: {type(e).__name__} - {e}")
            traceback.print_exc()
            await db.rollback()
            raise ChatServiceError(f"Ошибка сохранения ответа AI после стрима: {e}", status_code=500)

async def edit_and_regenerate_from_user_message(
    db: AsyncSession,
    chat_id: int,
    user_message_id: int,
    new_content: str,
    model_id: Optional[str] = None
) -> chat_schemas.Message:
    if chat_id <= 0 or user_message_id <= 0:
        raise ChatServiceError("Редактирование доступно только для постоянных чатов с валидными ID.", status_code=400, error_type="invalid_operation")

    history_for_ai: List[Dict[str, str]] = []
    final_model_id: Optional[str] = model_id

    async with db_write_lock:
        try:
            user_message_to_edit = await crud_chat.get_message(db, user_message_id)
            if not user_message_to_edit:
                raise ChatServiceError(f"Сообщение пользователя с ID {user_message_id} не найдено.", status_code=404, error_type="message_not_found")
            if user_message_to_edit.chat_id != chat_id:
                raise ChatServiceError("Сообщение не принадлежит указанному чату.", status_code=403, error_type="forbidden")
            if user_message_to_edit.role != 'user':
                raise ChatServiceError("Редактировать можно только сообщения пользователя.", status_code=400, error_type="invalid_role")

            if not final_model_id:
                next_message_after_user = await crud_chat.get_next_message(db, chat_id, user_message_id)
                if next_message_after_user and next_message_after_user.ai_model_name:
                    final_model_id = next_message_after_user.ai_model_name
                else:
                    history_before_user_msg = await crud_chat.get_messages_up_to(db, chat_id, user_message_id)
                    last_assistant_msg_in_history = next(
                        (msg for msg in reversed(history_before_user_msg) if msg.role == 'assistant' and msg.ai_model_name),
                        None
                    )
                    if last_assistant_msg_in_history:
                        final_model_id = last_assistant_msg_in_history.ai_model_name
                if not final_model_id:
                    raise ChatServiceError("Не удалось определить модель AI для регенерации. Укажите модель явно.", status_code=400, error_type="model_not_specified")
            elif final_model_id not in AVAILABLE_MODELS_DICT:
                 raise ChatServiceError(f"Указанная модель '{final_model_id}' недоступна.", status_code=400, error_type="invalid_model")

            updated_content = await crud_chat.update_message_content(db, user_message_id, new_content)
            if not updated_content:
                raise ChatServiceError("Не удалось обновить сообщение пользователя в БД.", status_code=500, error_type="db_update_failed")

            deleted_count = await crud_chat.delete_messages_after(db, chat_id, user_message_id)
            print(f"Chat Service (Edit/Regen): Удалено {deleted_count} сообщений после ID {user_message_id}.")

            current_history_models = await crud_chat.get_messages_up_to(db, chat_id, user_message_id)
            if not current_history_models:
                raise ChatServiceError("Не удалось собрать историю сообщений для регенерации.", status_code=500, error_type="history_error")
            history_for_ai = [{"role": msg.role, "content": msg.content} for msg in current_history_models]
        except Exception as db_error:
             await db.rollback()
             print(f"Chat Service (Edit/Regen DB Phase): Ошибка: {db_error}")
             if isinstance(db_error, ChatServiceError): raise db_error
             raise ChatServiceError(f"Ошибка БД при подготовке к регенерации: {db_error}", status_code=500)

    if final_model_id is None:
        raise ChatServiceError("Внутренняя ошибка: final_model_id не определен после фазы БД.", status_code=500, error_type="internal_error")

    ai_content_regenerated = None
    try:
        print(f"Chat Service (Edit/Regen AI Phase): Вызов AI с моделью {final_model_id}, {len(history_for_ai)} сообщений в истории.")
        ai_response_data = await voidai_service.get_ai_response(model=final_model_id, messages=history_for_ai) # Используем нестриминговый

        if "error_type" in ai_response_data:
            error_msg = ai_response_data.get("message", "Неизвестная ошибка от AI сервиса при регенерации.")
            status_code_from_ai = ai_response_data.get("status_code", 500)
            raise ChatServiceError(message=error_msg, error_type=ai_response_data.get("error_type"), status_code=status_code_from_ai)
        try:
            choice = ai_response_data.get("choices", [{}])[0]
            message_data_from_ai = choice.get("message", {})
            ai_content_regenerated = message_data_from_ai.get("content")
            if ai_content_regenerated is None:
                raise ChatServiceError("Ключ 'content' отсутствует в ответе AI при регенерации.", status_code=500, error_type="content_extraction_error")
            elif not ai_content_regenerated.strip():
                print(f"Ошибка [Chat Service]: AI ({final_model_id}) вернул пустой ответ при Edit/Regen.")
                raise ChatServiceError(f"Модель {final_model_id} выдала пустой ответ при регенерации. Пожалуйста, попробуйте переформулировать ваш запрос или выберите другую модель.", status_code=500, error_type="empty_response")
        except (IndexError, KeyError, TypeError) as e:
             raise ChatServiceError(f"Не удалось обработать структуру ответа AI при регенерации: {e}", status_code=500, error_type="response_parsing_error")
    except Exception as ai_error:
         print(f"Chat Service (Edit/Regen AI Phase): Ошибка: {ai_error}")
         if isinstance(ai_error, ChatServiceError): raise ai_error
         raise ChatServiceError(f"Ошибка при взаимодействии с AI сервисом: {ai_error}", status_code=500)

    async with db_write_lock:
        try:
            ai_message_to_create = chat_schemas.MessageCreate(role="assistant", content=ai_content_regenerated)
            db_new_ai_message_model = await crud_chat.create_message(
                db=db, message=ai_message_to_create, chat_id=chat_id,
                ai_model_name=final_model_id, is_temporary=False
            )
            await crud_chat.update_chat_timestamp(db=db, chat_id=chat_id)
            await db.commit()
            await db.refresh(db_new_ai_message_model)
            print(f"Chat Service (Edit/Regen): Новый ответ AI сохранен, updated_at чата {chat_id} обновлен.")
            return chat_schemas.Message.model_validate(db_new_ai_message_model)
        except Exception as commit_error:
            await db.rollback()
            print(f"Chat Service (Edit/Regen Commit Phase): Ошибка: {commit_error}")
            raise ChatServiceError(f"Ошибка сохранения результата регенерации в БД: {commit_error}", status_code=500)

async def regenerate_assistant_response(
    db: AsyncSession,
    chat_id: int,
    assistant_message_id: int,
    model_id: Optional[str] = None
) -> chat_schemas.Message:
    if chat_id <= 0 or assistant_message_id <= 0:
        raise ChatServiceError("Регенерация доступна только для постоянных чатов с валидными ID.", status_code=400, error_type="invalid_operation")

    history_for_ai: List[Dict[str, str]] = []
    final_model_id: Optional[str] = model_id
    preceding_user_message_id: Optional[int] = None

    async with db_write_lock:
        try:
            assistant_message_to_regen = await crud_chat.get_message(db, assistant_message_id)
            if not assistant_message_to_regen:
                raise ChatServiceError(f"Сообщение ассистента с ID {assistant_message_id} не найдено.", status_code=404, error_type="message_not_found")
            if assistant_message_to_regen.chat_id != chat_id:
                raise ChatServiceError("Сообщение не принадлежит указанному чату.", status_code=403, error_type="forbidden")
            if assistant_message_to_regen.role != 'assistant':
                raise ChatServiceError("Регенерировать можно только ответ ассистента.", status_code=400, error_type="invalid_role")

            preceding_message = await crud_chat.get_preceding_message(db, chat_id, assistant_message_id)
            if not preceding_message:
                raise ChatServiceError("Не найдено предыдущее сообщение для формирования контекста регенерации.", status_code=400, error_type="context_error")
            preceding_user_message_id = preceding_message.id

            if not final_model_id:
                 final_model_id = assistant_message_to_regen.ai_model_name
                 if not final_model_id:
                      history_before_regen_point = await crud_chat.get_messages_up_to(db, chat_id, preceding_user_message_id)
                      last_assistant_msg_in_history = next(
                          (msg for msg in reversed(history_before_regen_point) if msg.role == 'assistant' and msg.ai_model_name),
                          None
                      )
                      if last_assistant_msg_in_history:
                          final_model_id = last_assistant_msg_in_history.ai_model_name
                 if not final_model_id:
                     raise ChatServiceError("Не удалось определить модель AI для регенерации. Укажите модель явно.", status_code=400, error_type="model_not_specified")
            elif final_model_id not in AVAILABLE_MODELS_DICT:
                raise ChatServiceError(f"Указанная модель '{final_model_id}' недоступна.", status_code=400, error_type="invalid_model")

            deleted_count = await crud_chat.delete_messages_after(db, chat_id, preceding_user_message_id)
            print(f"Chat Service (Regen): Удалено {deleted_count} сообщений после ID {preceding_user_message_id}.")

            current_history_models = await crud_chat.get_messages_up_to(db, chat_id, preceding_user_message_id)
            if not current_history_models:
                raise ChatServiceError("Не удалось собрать историю сообщений для регенерации.", status_code=500, error_type="history_error")
            history_for_ai = [{"role": msg.role, "content": msg.content} for msg in current_history_models]
        except Exception as db_error:
             await db.rollback()
             print(f"Chat Service (Regen DB Phase): Ошибка: {db_error}")
             if isinstance(db_error, ChatServiceError): raise db_error
             raise ChatServiceError(f"Ошибка БД при подготовке к регенерации: {db_error}", status_code=500)

    if final_model_id is None or preceding_user_message_id is None:
        raise ChatServiceError("Внутренняя ошибка: final_model_id или ID предыдущего сообщения не определены после фазы БД.", status_code=500, error_type="internal_error")

    ai_content_regenerated = None
    try:
        print(f"Chat Service (Regen AI Phase): Вызов AI с моделью {final_model_id}, {len(history_for_ai)} сообщений в истории.")
        ai_response_data = await voidai_service.get_ai_response(model=final_model_id, messages=history_for_ai) # Используем нестриминговый

        if "error_type" in ai_response_data:
            error_msg = ai_response_data.get("message", "Неизвестная ошибка от AI сервиса при регенерации.")
            status_code_from_ai = ai_response_data.get("status_code", 500)
            raise ChatServiceError(message=error_msg, error_type=ai_response_data.get("error_type"), status_code=status_code_from_ai)
        try:
            choice = ai_response_data.get("choices", [{}])[0]
            message_data_from_ai = choice.get("message", {})
            ai_content_regenerated = message_data_from_ai.get("content")
            if ai_content_regenerated is None:
                raise ChatServiceError("Ключ 'content' отсутствует в ответе AI при регенерации.", status_code=500, error_type="content_extraction_error")
            elif not ai_content_regenerated.strip():
                print(f"Ошибка [Chat Service]: AI ({final_model_id}) вернул пустой ответ при Regen.")
                raise ChatServiceError(f"Модель {final_model_id} выдала пустой ответ при регенерации. Пожалуйста, попробуйте переформулировать ваш запрос или выберите другую модель.", status_code=500, error_type="empty_response")
        except (IndexError, KeyError, TypeError) as e:
              raise ChatServiceError(f"Не удалось обработать структуру ответа AI при регенерации: {e}", status_code=500, error_type="response_parsing_error")
    except Exception as ai_error:
         print(f"Chat Service (Regen AI Phase): Ошибка: {ai_error}")
         if isinstance(ai_error, ChatServiceError): raise ai_error
         raise ChatServiceError(f"Ошибка при взаимодействии с AI сервисом: {ai_error}", status_code=500)

    async with db_write_lock:
        try:
            ai_message_to_create = chat_schemas.MessageCreate(role="assistant", content=ai_content_regenerated)
            db_new_ai_message_model = await crud_chat.create_message(
                db=db, message=ai_message_to_create, chat_id=chat_id,
                ai_model_name=final_model_id, is_temporary=False
            )
            await crud_chat.update_chat_timestamp(db=db, chat_id=chat_id)
            await db.commit()
            await db.refresh(db_new_ai_message_model)
            print(f"Chat Service (Regen): Новый ответ AI сохранен, updated_at чата {chat_id} обновлен.")
            return chat_schemas.Message.model_validate(db_new_ai_message_model)
        except Exception as commit_error:
            await db.rollback()
            print(f"Chat Service (Regen Commit Phase): Ошибка: {commit_error}")
            raise ChatServiceError(f"Ошибка сохранения результата регенерации в БД: {commit_error}", status_code=500)

print("--- Сервис чата (chat_service.py) ЗАГРУЖЕН с поддержкой НЕСТРИМИНГОВОЙ обработки и вспомогательными функциями для СТРИМИНГА ---")