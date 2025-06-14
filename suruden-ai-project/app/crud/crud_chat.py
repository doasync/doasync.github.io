# Файл: app/crud/crud_chat.py
# ПОЛНАЯ ВЕРСИЯ с сортировкой по updated_at и функцией обновления таймстемпа

from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy import desc, asc, update, delete, and_
from sqlalchemy.orm import selectinload, noload
from sqlalchemy.sql import func # <<< Убедимся, что func импортирован

from app.db.models_db import Chat, Message # Импортируем модели SQLAlchemy
from app.schemas import chat_schemas # Импортируем схемы Pydantic

from typing import List, Optional
import datetime

# --- CRUD операции для Чатов ---

async def get_chat(db: AsyncSession, chat_id: int) -> Optional[Chat]:
    """Получить ПОСТОЯННЫЙ чат по ID вместе с сообщениями, используя selectinload."""
    if chat_id <= 0: return None

    result = await db.execute(
        select(Chat)
        .where(Chat.id == chat_id)
        .options(selectinload(Chat.messages)) # Загружаем сообщения сразу
    )
    chat = result.scalars().first()

    if chat and chat.messages:
        # Сортируем сообщения в памяти по ID
        chat.messages.sort(key=lambda m: m.id if m.id is not None else float('inf'))

    return chat


async def get_chats(db: AsyncSession, skip: int = 0, limit: int = 100) -> List[Chat]:
    """Получить список ПОСТОЯННЫХ чатов (без сообщений), отсортированных по последнему обновлению."""
    query = (
        select(Chat)
        .options(noload(Chat.messages)) # Явно НЕ загружаем сообщения
        # --- ИЗМЕНЕНИЕ: Сортировка по updated_at (сначала новые) ---
        .order_by(Chat.updated_at.desc())
        # -------------------------------------------
        .offset(skip)
        .limit(limit)
    )
    result = await db.execute(query)
    chats = result.scalars().all()
    return chats


async def create_chat(db: AsyncSession, chat_data: chat_schemas.ChatCreate) -> Chat:
    """
    Создать новый чат (SQLAlchemy объект).
    Если chat_data.is_temporary=True, чат не сохраняется в БД.
    """
    is_temporary = chat_data.is_temporary

    if not is_temporary:
        # --- Логика для ПОСТОЯННЫХ чатов ---
        db_chat = Chat(
            title=chat_data.title
            # created_at и updated_at будут установлены через server_default
        )
        db.add(db_chat)
        await db.flush() # Получаем ID и значения по умолчанию
        return db_chat
    else:
        # --- Логика для ВРЕМЕННЫХ чатов ---
        print("CRUD: Создание временного объекта Chat (не сохраняется в БД)")
        now = datetime.datetime.now(datetime.timezone.utc)
        temp_chat = Chat(
            id=None, title=chat_data.title, created_at=now, updated_at=now # <<< Устанавливаем updated_at для временного
        )
        temp_chat.messages = [] # Инициализируем пустой список сообщений
        return temp_chat


async def update_chat(db: AsyncSession, chat_id: int, chat_data: chat_schemas.ChatUpdate) -> Optional[Chat]:
    """Обновить ПОСТОЯННЫЙ чат (название). Также обновляет updated_at."""
    if chat_id <= 0: return None

    update_values = chat_data.model_dump(exclude_unset=True)
    if not update_values: # Нечего обновлять
         chat = await db.get(Chat, chat_id) # Просто получаем текущий
         return chat

    # Добавляем обновление updated_at вручную (на случай, если onupdate не сработает надежно)
    update_values['updated_at'] = func.now()

    # Обновляем только указанные поля (сейчас это только title) + updated_at
    stmt = (
        update(Chat)
        .where(Chat.id == chat_id)
        .values(**update_values)
        .returning(Chat) # Возвращаем обновленный объект
    )
    result = await db.execute(stmt)
    updated_chat_obj = result.scalar_one_or_none()

    if updated_chat_obj:
        try:
            await db.commit() # Коммитим изменения
            print(f"CRUD: Чат {chat_id} обновлен (название + таймстемп).")
            return updated_chat_obj
        except Exception as e:
            await db.rollback()
            print(f"Ошибка при обновлении и коммите чата {chat_id}: {e}")
            raise
    else:
        # Альтернативная логика, если returning не сработал
        chat_to_update = await db.get(Chat, chat_id)
        if not chat_to_update:
             await db.rollback()
             return None
        for key, value in update_values.items():
             setattr(chat_to_update, key, value)
        try:
             await db.commit()
             await db.refresh(chat_to_update) # Обновляем из БД
             return chat_to_update
        except Exception as e:
             await db.rollback()
             print(f"Ошибка при обновлении (метод get) и коммите чата {chat_id}: {e}")
             raise


async def delete_chat(db: AsyncSession, chat_id: int) -> bool:
    """Удалить ПОСТОЯННЫЙ чат и все его сообщения (каскадно)."""
    if chat_id <= 0: return False

    chat_to_delete = await db.get(Chat, chat_id)
    if not chat_to_delete:
        return False

    try:
        await db.delete(chat_to_delete) # SQLAlchemy обработает каскадное удаление сообщений
        await db.commit()
        print(f"CRUD: Чат {chat_id} и его сообщения удалены.")
        return True
    except Exception as e:
        await db.rollback()
        print(f"Ошибка при удалении чата {chat_id}: {e}")
        return False

# --- ДОБАВЛЕНО: Функция для явного обновления updated_at чата ---
async def update_chat_timestamp(db: AsyncSession, chat_id: int):
    """
    Явно обновляет поле updated_at для указанного чата.
    НЕ делает commit. Предполагается, что будет вызвано внутри другой транзакции.
    """
    if chat_id <= 0:
        print(f"CRUD WARN: Попытка обновить таймстемп для невалидного chat_id: {chat_id}")
        return
    stmt = (
        update(Chat)
        .where(Chat.id == chat_id)
        .values(updated_at=func.now()) # Используем func.now() для времени БД
    )
    await db.execute(stmt)
    print(f"CRUD: Запланировано обновление updated_at для чата {chat_id}")
# -------------------------------------------------------------

# --- CRUD операции для Сообщений ---

async def create_message(
    db: AsyncSession,
    message: chat_schemas.MessageCreate,
    chat_id: int, # ID постоянного чата (или фиктивный для временного, но он тут не используется)
    ai_model_name: Optional[str] = None,
    is_temporary: bool = False
) -> Message: # Возвращаем модель SQLAlchemy
    """
    Создать объект сообщения SQLAlchemy.
    Если is_temporary=False, добавляет его в сессию db (НЕ коммитит).
    Если is_temporary=True, возвращает объект без сессии/ID.
    """
    now = datetime.datetime.now(datetime.timezone.utc)

    if not is_temporary:
        # --- Логика для ПОСТОЯННЫХ сообщений ---
        if chat_id <= 0:
             raise ValueError("Valid chat_id (> 0) is required for non-temporary messages.")

        db_message = Message(
            chat_id=chat_id,
            role=message.role,
            content=message.content,
            ai_model_name=ai_model_name,
            # timestamp будет установлен БД по умолчанию (server_default=func.now())
        )
        db.add(db_message)
        await db.flush() # Получаем ID и timestamp (если они генерятся)
        # Коммит и refresh будут сделаны в сервисе chat_service
        return db_message
    else:
        # --- Логика для ВРЕМЕННЫХ сообщений ---
        temp_message = Message(
            id=None, chat_id=chat_id, # Сохраняем фиктивный ID чата
            role=message.role, content=message.content, timestamp=now,
            ai_model_name=ai_model_name, is_deleted=False
        )
        return temp_message

# --- CRUD ФУНКЦИИ для сообщений (остаются без изменений) ---

async def get_message(db: AsyncSession, message_id: int) -> Optional[Message]:
    """Получить одно сообщение по его ID."""
    if message_id <= 0: return None
    message = await db.get(Message, message_id)
    return message

async def get_next_message(db: AsyncSession, chat_id: int, message_id: int) -> Optional[Message]:
    """Получить сообщение, следующее сразу за message_id в том же чате."""
    if chat_id <= 0 or message_id <= 0: return None
    result = await db.execute(
        select(Message)
        .where(and_(Message.chat_id == chat_id, Message.id > message_id))
        .order_by(Message.id.asc()) # Сортируем по ID по возрастанию
        .limit(1)
    )
    return result.scalars().first()

async def get_preceding_message(db: AsyncSession, chat_id: int, message_id: int) -> Optional[Message]:
    """Получить сообщение, предшествующее message_id в том же чате."""
    if chat_id <= 0 or message_id <= 0: return None
    result = await db.execute(
        select(Message)
        .where(and_(Message.chat_id == chat_id, Message.id < message_id))
        .order_by(Message.id.desc()) # Сортируем по ID по убыванию
        .limit(1)
    )
    return result.scalars().first()

async def update_message_content(db: AsyncSession, message_id: int, new_content: str) -> bool:
    """Обновить поле content у сообщения с заданным message_id."""
    if message_id <= 0: return False
    stmt = (
        update(Message)
        .where(Message.id == message_id)
        .values(content=new_content)
    )
    result = await db.execute(stmt)
    # НЕ делаем commit здесь, он будет в сервисе
    return result.rowcount > 0

async def delete_messages_after(db: AsyncSession, chat_id: int, message_id: int) -> int:
    """Удалить все сообщения в чате chat_id, ID которых БОЛЬШЕ message_id."""
    if chat_id <= 0 or message_id <= 0: return 0
    stmt = (
        delete(Message)
        .where(and_(Message.chat_id == chat_id, Message.id > message_id))
    )
    result = await db.execute(stmt)
    # НЕ делаем commit здесь
    deleted_count = result.rowcount
    print(f"CRUD: Помечено к удалению {deleted_count} сообщений после ID {message_id} в чате {chat_id}.")
    return deleted_count

async def get_messages_up_to(db: AsyncSession, chat_id: int, message_id: int) -> List[Message]:
    """Получить все сообщения в чате chat_id до message_id включительно, отсортированные по ID."""
    if chat_id <= 0 or message_id <= 0: return []
    result = await db.execute(
        select(Message)
        .where(and_(Message.chat_id == chat_id, Message.id <= message_id))
        .order_by(Message.id.asc()) # Убедимся в правильном порядке для истории
    )
    return result.scalars().all()
async def get_chat_history_for_ai(db: AsyncSession, chat_id: int) -> List[Message]:
    """
    Получить всю историю сообщений для данного чата, отсортированную по ID.
    Используется для подготовки контекста для AI.
    """
    if chat_id <= 0: return []
    result = await db.execute(
        select(Message)
        .where(Message.chat_id == chat_id)
        .order_by(Message.id.asc())
    )
    return result.scalars().all()

async def delete_message(db: AsyncSession, message_id: int) -> bool:
    """Удалить ПОСТОЯННОЕ сообщение по ID."""
    if message_id <= 0: return False

    message_to_delete = await db.get(Message, message_id)
    if not message_to_delete:
        print(f"CRUD: Сообщение {message_id} не найдено для удаления.")
        return False

    try:
        await db.delete(message_to_delete)
        # Коммит делается здесь, т.к. это атомарная операция удаления ОДНОГО сообщения
        await db.commit()
        print(f"CRUD: Сообщение {message_id} успешно удалено из БД.")
        return True
    except Exception as e:
        await db.rollback()
        print(f"Ошибка при удалении сообщения {message_id}: {e}")
        return False

async def create_ai_message(db: AsyncSession, chat_id: int, content: str, model_id: str) -> Message:
    """Создать сообщение от AI и добавить его в БД (без коммита)."""
    if chat_id <= 0:
        raise ValueError("Valid chat_id (> 0) is required for AI messages.")
    
    db_message = Message(
        chat_id=chat_id,
        role="assistant",
        content=content,
        ai_model_name=model_id
    )
    db.add(db_message)
    await db.flush()
    return db_message

# Сообщение о загрузке файла
print("--- CRUD чата (crud_chat.py) загружен с сортировкой по UPDATED_AT и функцией update_chat_timestamp ---")