# Файл: app/routers/chat_api.py
from fastapi import APIRouter, Depends, HTTPException, status, Request
from fastapi.responses import StreamingResponse
from sqlalchemy.ext.asyncio import AsyncSession
from typing import List, Optional, Tuple, Dict, AsyncGenerator
import json
import asyncio
import uuid
import traceback

from pydantic import BaseModel, Field

from app.db.database import get_async_db
from app.crud import crud_chat
from app.schemas import chat_schemas
from app.services import chat_service, voidai_service
from app.services.chat_service import ChatServiceError
from app.core.config import NON_STREAMING_MODELS_SET

class RegenerateRequest(BaseModel):
    model_id: Optional[str] = Field(None, description="ID модели AI для использования при регенерации (если не указан, используется модель из истории)")

router = APIRouter(
    prefix="/api/v1/chats",
    tags=["Chats"],
    responses={404: {"description": "Ресурс не найден"}},
)

@router.post("/", response_model=chat_schemas.ChatInfo, status_code=status.HTTP_201_CREATED,
             summary="Создать новый чат (постоянный или временный)")
async def create_new_chat(
    chat_data: chat_schemas.ChatCreate,
    db: AsyncSession = Depends(get_async_db)
):
    try:
        chat_data_for_creation = chat_data.model_copy(update={'initial_message': None})
        new_chat_obj = await crud_chat.create_chat(db=db, chat_data=chat_data_for_creation)
        if not chat_data.is_temporary:
            try:
                await db.commit()
                print(f"Чат ID {new_chat_obj.id} успешно создан и закоммичен.")
                await db.refresh(new_chat_obj)
                return chat_schemas.ChatInfo.model_validate(new_chat_obj)
            except Exception as commit_error:
                await db.rollback()
                print(f"ОШИБКА КОММИТА при создании чата: {commit_error}")
                raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Ошибка сохранения чата в БД")
        else:
            return chat_schemas.ChatInfo(
                id=0, title=new_chat_obj.title, created_at=new_chat_obj.created_at,
            )
    except ValueError as e:
         raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))
    except Exception as e:
         print(f"Непредвиденная ошибка при создании чата: {e}")
         traceback.print_exc()
         if not chat_data.is_temporary: await db.rollback()
         raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Внутренняя ошибка сервера при создании чата")

@router.get("/", response_model=List[chat_schemas.ChatInfo], summary="Получить список постоянных чатов")
async def read_chats_list(skip: int = 0, limit: int = 100, db: AsyncSession = Depends(get_async_db)):
    chats = await crud_chat.get_chats(db=db, skip=skip, limit=limit)
    return chats

@router.get("/{chat_id}", response_model=chat_schemas.Chat, summary="Получить детали постоянного чата")
async def read_chat_details(chat_id: int, db: AsyncSession = Depends(get_async_db)):
    if chat_id <= 0:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Временные чаты не имеют постоянной истории.")
    db_chat = await crud_chat.get_chat(db=db, chat_id=chat_id)
    if db_chat is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Чат с ID {chat_id} не найден.")
    return db_chat

@router.put("/{chat_id}", response_model=chat_schemas.ChatInfo, summary="Обновить постоянный чат (название)")
async def update_existing_chat(chat_id: int, chat_data: chat_schemas.ChatUpdate, db: AsyncSession = Depends(get_async_db)):
    if chat_id <= 0:
         raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Невозможно обновить временный чат.")
    updated_chat = await crud_chat.update_chat(db=db, chat_id=chat_id, chat_data=chat_data)
    if updated_chat is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Чат с ID {chat_id} не найден для обновления.")
    return chat_schemas.ChatInfo.model_validate(updated_chat)

@router.delete("/{chat_id}", status_code=status.HTTP_204_NO_CONTENT, summary="Удалить постоянный чат")
async def delete_existing_chat(chat_id: int, db: AsyncSession = Depends(get_async_db)):
    if chat_id <= 0:
         raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Невозможно удалить временный чат.")
    deleted = await crud_chat.delete_chat(db=db, chat_id=chat_id)
    if not deleted:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Чат с ID {chat_id} не найден для удаления.")
    return None

@router.post(
    "/{chat_id}/completion",
    summary="Отправить сообщение и получить ответ AI (стриминг/обычный)",
    description=(
        "Принимает сообщение пользователя, ID модели, флаг `is_temporary`, историю и `user_temp_id`.\\n"
        "- Если модель поддерживает стриминг (не в NON_STREAMING_MODELS_SET), возвращает `text/event-stream`.\\n"
        "  - Первый SSE event содержит объект `user_message`.\\n"
        "  - Последующие SSE events содержат `{ \"delta\": \"текст\" }`.\\n"
        "  - Последний SSE event может быть `{ \"done\": true }` (или просто конец потока).\\n"
        "- Если стриминг отключен для модели, возвращает JSON `ChatCompletionResponse` (как раньше).\\n"
        "- Обрабатывает постоянные и временные чаты."
    )
)
async def send_message_and_get_response_controller(
    chat_id: int,
    request_body: chat_schemas.ChatCompletionRequestBody,
    db: AsyncSession = Depends(get_async_db),
    request: Request = None
):
    model_id = request_body.ai_model_id
    message_data = request_body.message_data
    is_temporary = request_body.is_temporary
    history_from_request = request_body.history
    user_temp_id = request_body.user_temp_id
    user_streaming_preference = request_body.streaming

    if message_data.role != "user":
         raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Роль должна быть 'user' для этого эндпоинта.")

    chat_id_for_api = 0 if is_temporary else chat_id
    if not is_temporary and chat_id_for_api <= 0:
         raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Валидный ID чата (> 0) обязателен для постоянных чатов.")
    if is_temporary and history_from_request is None:
         print("Предупреждение: Временный чат вызван без истории (возможно, первое сообщение).")
         history_from_request = []

    # Учитываем пользовательскую настройку стриминга: если пользователь отключил стриминг
    # или модель не поддерживает стриминг, то используем обычный режим
    model_supports_streaming = model_id not in NON_STREAMING_MODELS_SET
    use_streaming = user_streaming_preference and model_supports_streaming
    print(f"API /completion: Чат {chat_id_for_api}, Модель {model_id}, Пользователь хочет стриминг={user_streaming_preference}, Модель поддерживает стриминг={model_supports_streaming}, Итоговое решение={use_streaming}")

    if not use_streaming:
        try:
            user_msg_schema, ai_msg_schema = await chat_service.process_user_message_non_streaming(
                db=db, chat_id=chat_id_for_api, user_message=message_data, model_id=model_id,
                is_temporary=is_temporary, history=history_from_request, user_temp_id=user_temp_id
            )
            return chat_schemas.ChatCompletionResponse(
                user_message=user_msg_schema,
                assistant_message=ai_msg_schema
            )
        except ChatServiceError as e:
            print(f"Ошибка ChatServiceError в API (non-streaming): type={e.error_type}, status={e.status_code}, msg={e.message}")
            response_status_code = e.status_code
            if e.error_type == "invalid_key": response_status_code = 400
            elif e.error_type == "rate_limit_final": response_status_code = 429
            elif e.error_type == "no_available_keys": response_status_code = 503
            elif e.error_type == "api_error" and e.status_code == 400: response_status_code = 400
            elif e.error_type == "api_error" and e.status_code == 429: response_status_code = 429
            elif e.error_type == "api_error" or e.error_type == "network_error": response_status_code = 503
            elif e.error_type == "chat_not_found": response_status_code = 404
            elif e.error_type == "model_not_specified": response_status_code = 400
            elif e.error_type == "invalid_model": response_status_code = 400
            elif e.error_type == "content_extraction_error": response_status_code = 500
            elif e.error_type == "response_parsing_error": response_status_code = 500
            final_status_code = response_status_code if response_status_code else 500
            raise HTTPException(status_code=final_status_code, detail=str(e.message))
        except Exception as e:
             print(f"Непредвиденная ошибка в API (non-streaming): {e}")
             traceback.print_exc()
             raise HTTPException(status_code=500, detail="Произошла внутренняя ошибка сервера.")
    else: # use_streaming
        ai_temp_id = f"temp-{uuid.uuid4()}-assistant"
        try:
            user_msg_schema, history_for_ai = await chat_service.prepare_and_save_user_message(
                db=db, chat_id=chat_id_for_api, user_message=message_data,
                is_temporary=is_temporary, history=history_from_request, user_temp_id=user_temp_id
            )
        except ChatServiceError as e:
            print(f"Ошибка ChatServiceError при подготовке стрима: {e}")
            raise HTTPException(status_code=e.status_code or 500, detail=f"Ошибка подготовки: {e.message}")
        except Exception as e:
            print(f"Непредвиденная ошибка при подготовке стрима: {e}")
            traceback.print_exc()
            raise HTTPException(status_code=500, detail="Ошибка подготовки стрима.")

        async def stream_generator() -> AsyncGenerator[str, None]:
            first_event_data = {"user_message": user_msg_schema.model_dump(mode='json')}
            yield f"data: {json.dumps(first_event_data)}\n\n"
            print("Stream API: Отправлен user_message event")

            full_ai_content = ""
            stream_error = None
            ai_response_stream = None

            try:
                ai_response_stream = voidai_service.stream_ai_response(
                    model=model_id, messages=history_for_ai
                )
                async for chunk in ai_response_stream:
                    if await request.is_disconnected():
                         print("Stream API: Клиент отключился, прерывание стрима.")
                         stream_error = ChatServiceError("Клиент отключился", error_type="client_disconnected", status_code=499)
                         break
                    if "error_type" in chunk:
                        stream_error = ChatServiceError(
                            message=chunk.get("message", "Ошибка стриминга от AI сервиса"),
                            error_type=chunk.get("error_type"),
                            status_code=chunk.get("status_code")
                        )
                        print(f"Stream API: Получена ошибка из voidai_service: {stream_error}")
                        break
                    delta = ""
                    try:
                         delta = chunk.get("choices", [{}])[0].get("delta", {}).get("content", "")
                    except (IndexError, KeyError, TypeError):
                         print(f"Stream API WARNING: Не удалось извлечь delta из чанка: {chunk}")
                         continue
                    if delta:
                         full_ai_content += delta
                         delta_event_data = {"delta": delta}
                         yield f"data: {json.dumps(delta_event_data)}\n\n"

                print(f"Stream API: Стрим завершен. Собрано {len(full_ai_content)} символов.")

                if stream_error:
                    print(f"Stream API: Ошибка во время стрима ({stream_error.error_type}), ответ AI НЕ будет сохранен.")
                    if not await request.is_disconnected():
                         error_event_data = {"error": {"message": stream_error.message, "type": stream_error.error_type}}
                         yield f"data: {json.dumps(error_event_data)}\n\n"
                    return

                # Проверка на пустой ответ
                if not full_ai_content.strip():
                    print("Stream API: Модель вернула пустой ответ")
                    if not await request.is_disconnected():
                        error_event_data = {"error": {"message": f"Модель {model_id} выдала пустой ответ. Пожалуйста, попробуйте переформулировать ваш запрос или выберите другую модель.", "type": "empty_response"}}
                        yield f"data: {json.dumps(error_event_data)}\n\n"
                    return

                if not is_temporary and chat_id_for_api > 0:
                    try:
                         print("Stream API: Вызов save_assistant_message...")
                         saved_ai_msg = await chat_service.save_assistant_message(
                             db=db, chat_id=chat_id_for_api, ai_content=full_ai_content,
                             model_id=model_id, ai_temp_id=ai_temp_id
                         )
                         print(f"Stream API: Ответ AI сохранен с ID {saved_ai_msg.id}")
                         yield f"data: {json.dumps({'done': True, 'assistant_message_id': saved_ai_msg.id})}\n\n"
                    except ChatServiceError as e_save:
                        print(f"Stream API ERROR: Ошибка сохранения ответа AI после стрима: {e_save}")
                        if not await request.is_disconnected():
                            error_event_data = {"error": {"message": f"Ошибка сохранения ответа: {e_save.message}", "type": "save_error"}}
                            yield f"data: {json.dumps(error_event_data)}\n\n"
                    except Exception as e_save_unexp:
                         print(f"Stream API UNEXPECTED ERROR: Непредв. ошибка сохранения ответа AI: {e_save_unexp}")
                         if not await request.is_disconnected():
                            error_event_data = {"error": {"message": "Внутренняя ошибка сохранения ответа.", "type": "internal_save_error"}}
                            yield f"data: {json.dumps(error_event_data)}\n\n"
                else:
                     print("Stream API: Временный чат, ответ AI не сохраняется.")
                     yield f"data: {json.dumps({'done': True})}\n\n"
            except asyncio.CancelledError:
                 print("Stream API: Генератор был отменен (возможно, из-за disconnect).")
            except Exception as e_gen:
                 print(f"Stream API UNEXPECTED ERROR в генераторе: {type(e_gen).__name__} - {e_gen}")
                 traceback.print_exc()
                 if not await request.is_disconnected():
                    try:
                        error_event_data = {"error": {"message": "Внутренняя ошибка сервера во время стриминга.", "type": "internal_stream_error"}}
                        yield f"data: {json.dumps(error_event_data)}\n\n"
                    except Exception as e_yield:
                         print(f"Stream API ERROR: Не удалось отправить сообщение об ошибке клиенту: {e_yield}")
            finally:
                print("Stream API: Генератор завершает работу.")
        return StreamingResponse(stream_generator(), media_type="text/event-stream")

class MessageEditRequest(BaseModel):
    new_content: str
    model_id: Optional[str] = Field(None, description="ID модели AI для использования при регенерации (если не указан, используется модель из истории)")

@router.put(
    "/{chat_id}/messages/{message_id}/edit_and_regenerate",
    summary="Изменить сообщение пользователя и регенерировать ответ AI (ПОСТОЯННЫЕ ЧАТЫ, СТРИМИНГ)"
)
async def edit_user_message_and_regenerate(
    chat_id: int, message_id: int, request_data: MessageEditRequest,
    db: AsyncSession = Depends(get_async_db),
    request: Request = None
):
    if chat_id <= 0 or message_id <= 0:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Некорректные ID чата или сообщения.")
    if not request_data.new_content or not request_data.new_content.strip():
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Новое содержимое сообщения не может быть пустым.")
    # Подготовка: обновить сообщение пользователя и получить историю
    try:
        async with chat_service.db_write_lock:
            user_msg = await crud_chat.get_message(db, message_id=message_id)
            if user_msg is None:
                raise ChatServiceError("Сообщение не найдено", error_type="message_not_found")
            if user_msg.role != "user":
                raise ChatServiceError("Роль сообщения должна быть 'user'", error_type="invalid_role")
            user_msg.content = request_data.new_content
            await db.commit()
            await db.refresh(user_msg)
            await crud_chat.delete_messages_after(db=db, chat_id=chat_id, message_id=message_id)
            history_for_ai = await crud_chat.get_chat_history_for_ai(db, chat_id=chat_id)
        model_id = request_data.model_id if request_data.model_id else user_msg.ai_model_name
    except ChatServiceError as e:
        status = e.status_code or 500
        raise HTTPException(status_code=status, detail=e.message)
    except Exception as e:
        print(f"Ошибка подготовки при редактировании сообщения: {e}")
        traceback.print_exc()
        await db.rollback()
        raise HTTPException(status_code=500, detail="Ошибка подготовки стрима при редактировании сообщения.")
    async def stream_generator() -> AsyncGenerator[str, None]:
        # Преобразуем SQLAlchemy объект в Pydantic модель
        user_msg_schema = chat_schemas.Message.model_validate(user_msg)
        first_event = {"user_message": user_msg_schema.model_dump(mode="json")}
        yield f"data: {json.dumps(first_event)}\n\n"
        full_ai_content = ""
        stream_error = None
        try:
            ai_stream = voidai_service.stream_ai_response(model=model_id, messages=history_for_ai)
            async for chunk in ai_stream:
                if await request.is_disconnected():
                    stream_error = ChatServiceError("Клиент отключился", error_type="client_disconnected", status_code=499)
                    break
                if "error_type" in chunk:
                    stream_error = ChatServiceError(
                        message=chunk.get("message", "Ошибка стриминга от AI сервиса"),
                        error_type=chunk.get("error_type"),
                        status_code=chunk.get("status_code")
                    )
                    break
                delta = chunk.get("choices", [{}])[0].get("delta", {}).get("content", "")
                if delta:
                    full_ai_content += delta
                    yield f"data: {json.dumps({'delta': delta})}\n\n"
            if stream_error:
                if not await request.is_disconnected():
                    yield f"data: {json.dumps({'error': {'message': stream_error.message, 'type': stream_error.error_type}})}\n\n"
                return
            # Проверка на пустой ответ
            if not full_ai_content.strip():
                print("Stream API (Edit): Модель вернула пустой ответ")
                if not await request.is_disconnected():
                    yield f"data: {json.dumps({'error': {'message': f'Модель {model_id} выдала пустой ответ. Пожалуйста, попробуйте переформулировать ваш запрос или выберите другую модель.', 'type': 'empty_response'}})}\n\n"
                return
            async with chat_service.db_write_lock:
                new_ai_msg = await crud_chat.create_ai_message(
                    db=db, chat_id=chat_id, content=full_ai_content, model_id=model_id
                )
                await db.commit()
                await db.refresh(new_ai_msg)
            yield f"data: {json.dumps({'done': True, 'assistant_message_id': new_ai_msg.id})}\n\n"
        except asyncio.CancelledError:
            print("Stream API: Генератор отменен при редактировании")
        except Exception as e:
            print(f"Stream API UNEXPECTED ERROR при редактировании: {e}")
            traceback.print_exc()
            if not await request.is_disconnected():
                yield f"data: {json.dumps({'error': {'message': 'Внутренняя ошибка стрима при редактировании.', 'type': 'internal_stream_error'}})}\n\n"
    return StreamingResponse(stream_generator(), media_type="text/event-stream")

@router.post(
    "/{chat_id}/messages/{assistant_message_id}/regenerate",
    summary="Регенерировать ответ AI (ПОСТОЯННЫЕ ЧАТЫ, СТРИМИНГ)"
)
async def regenerate_assistant_message(
    chat_id: int, assistant_message_id: int,
    request_data: Optional[RegenerateRequest] = None,
    db: AsyncSession = Depends(get_async_db),
    request: Request = None
):
    if chat_id <= 0 or assistant_message_id <= 0:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Некорректные ID чата или сообщения.")
    # Подготовка: удалить старый ответ и получить историю
    try:
        async with chat_service.db_write_lock:
            old_msg = await crud_chat.get_message(db, message_id=assistant_message_id)
            if old_msg is None:
                raise ChatServiceError("Сообщение не найдено", error_type="message_not_found")
            if old_msg.role != "assistant":
                raise ChatServiceError("Роль сообщения должна быть 'assistant'", error_type="invalid_role")
            await crud_chat.delete_message(db, message_id=assistant_message_id)
            history_for_ai = await crud_chat.get_chat_history_for_ai(db, chat_id=chat_id)
            final_model_id = request_data.model_id if request_data and request_data.model_id else old_msg.ai_model_name
    except ChatServiceError as e:
        status = e.status_code or 500
        raise HTTPException(status_code=status, detail=e.message)
    except Exception as e:
        print(f"Ошибка подготовки при регенерации сообщения: {e}")
        traceback.print_exc()
        await db.rollback()
        raise HTTPException(status_code=500, detail="Ошибка подготовки стрима при регенерации сообщения.")
    async def stream_generator() -> AsyncGenerator[str, None]:
        full_ai_content = ""
        stream_error = None
        try:
            ai_stream = voidai_service.stream_ai_response(model=final_model_id, messages=history_for_ai)
            async for chunk in ai_stream:
                if await request.is_disconnected():
                    stream_error = ChatServiceError("Клиент отключился", error_type="client_disconnected", status_code=499)
                    break
                if "error_type" in chunk:
                    stream_error = ChatServiceError(
                        message=chunk.get("message", "Ошибка стриминга от AI сервиса"),
                        error_type=chunk.get("error_type"),
                        status_code=chunk.get("status_code")
                    )
                    break
                delta = chunk.get("choices", [{}])[0].get("delta", {}).get("content", "")
                if delta:
                    full_ai_content += delta
                    yield f"data: {json.dumps({'delta': delta})}\n\n"
            if stream_error:
                if not await request.is_disconnected():
                    yield f"data: {json.dumps({'error': {'message': stream_error.message, 'type': stream_error.error_type}})}\n\n"
                return
            # Проверка на пустой ответ
            if not full_ai_content.strip():
                print("Stream API (Regenerate): Модель вернула пустой ответ")
                if not await request.is_disconnected():
                    yield f"data: {json.dumps({'error': {'message': f'Модель {final_model_id} выдала пустой ответ. Пожалуйста, попробуйте переформулировать ваш запрос или выберите другую модель.', 'type': 'empty_response'}})}\n\n"
                return
            async with chat_service.db_write_lock:
                new_ai_msg = await crud_chat.create_ai_message(
                    db=db, chat_id=chat_id, content=full_ai_content, model_id=final_model_id
                )
                await db.commit()
                await db.refresh(new_ai_msg)
            yield f"data: {json.dumps({'done': True, 'assistant_message_id': new_ai_msg.id})}\n\n"
        except asyncio.CancelledError:
            print("Stream API: Генератор отменен при регенерации")
        except Exception as e:
            print(f"Stream API UNEXPECTED ERROR при регенерации: {e}")
            traceback.print_exc()
            if not await request.is_disconnected():
                yield f"data: {json.dumps({'error': {'message': 'Внутренняя ошибка стрима при регенерации.', 'type': 'internal_stream_error'}})}\n\n"
    return StreamingResponse(stream_generator(), media_type="text/event-stream")

@router.delete(
    "/{chat_id}/messages/{message_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Удалить сообщение из постоянного чата"
)
async def delete_chat_message(chat_id: int, message_id: int, db: AsyncSession = Depends(get_async_db)):
    if chat_id <= 0 or message_id <= 0:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Некорректные ID чата или сообщения.")
    deleted = await crud_chat.delete_message(db=db, message_id=message_id)
    if not deleted:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Сообщение с ID {message_id} не найдено или не удалось удалить.")
    print(f"Эндпоинт: Сообщение {message_id} из чата {chat_id} успешно удалено.")
    return None

print("--- API роутер для чатов (chat_api.py) ЗАГРУЖЕН с поддержкой условного СТРИМИНГА ---")