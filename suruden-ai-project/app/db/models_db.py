# Файл: app/db/models_db.py
# ПОЛНАЯ ВЕРСИЯ с добавленным полем updated_at и индексом

import datetime
from sqlalchemy import (
    create_engine, Column, Integer, String, Text, DateTime, ForeignKey, Boolean
)
from sqlalchemy.orm import relationship, declarative_base
from sqlalchemy.sql import func

# Импортируем URL базы данных из нашей конфигурации
from app.core.config import settings

# Создаем базовый класс для наших моделей SQLAlchemy
Base = declarative_base()

# --- Модель для Чата ---
class Chat(Base):
    __tablename__ = "chats" # Имя таблицы в БД

    id = Column(Integer, primary_key=True, index=True) # Уникальный ID чата
    title = Column(String(100), default="Новый чат") # Название чата, по умолчанию "Новый чат"
    created_at = Column(DateTime(timezone=True), server_default=func.now()) # Время создания

    # --- ДОБАВЛЕНО: Поле для времени последнего обновления ---
    # Это поле будет автоматически обновляться при любом изменении записи чата
    # или при явном обновлении через наш код.
    # Индекс (index=True) важен для быстрой сортировки.
    updated_at = Column(
        DateTime(timezone=True),
        server_default=func.now(), # Изначально равно времени создания
        onupdate=func.now(),       # Автоматически обновляется при обновлении записи (может зависеть от БД/SQLAlchemy)
        index=True                 # <<< ДОБАВЛЕН ИНДЕКС: Важно для сортировки
    )
    # ------------------------------------------------------

    # Связь "один ко многим": один чат может иметь много сообщений
    messages = relationship("Message", back_populates="chat", cascade="all, delete-orphan")

    def __repr__(self):
        # Добавили updated_at в строковое представление для отладки
        return f"<Chat(id={self.id}, title='{self.title}', updated='{self.updated_at}')>"


# --- Модель для Сообщения ---
class Message(Base):
    __tablename__ = "messages" # Имя таблицы в БД

    id = Column(Integer, primary_key=True, index=True) # Уникальный ID сообщения
    chat_id = Column(Integer, ForeignKey("chats.id"), nullable=False, index=True) # Внешний ключ на таблицу chats
    role = Column(String(20), nullable=False) # Роль (например, "user", "assistant")
    content = Column(Text, nullable=False) # Текст сообщения
    timestamp = Column(DateTime(timezone=True), server_default=func.now()) # Время создания сообщения
    ai_model_name = Column(String(100), nullable=True) # Какая модель AI использовалась для ответа (если role="assistant")
    is_deleted = Column(Boolean, default=False) # Флаг "мягкого" удаления (пока не используется, но полезно)

    # Связь "многие к одному": много сообщений принадлежат одному чату
    chat = relationship("Chat", back_populates="messages")

    def __repr__(self):
        return f"<Message(id={self.id}, chat_id={self.chat_id}, role='{self.role}')>"

# --- Настройка соединения с БД (Engine) ---
engine = create_engine(
    settings.database_url,
    # echo=True, # Раскомментируй для отладки SQL запросов
    connect_args={"check_same_thread": False} # Обязательно для SQLite с FastAPI/SQLAlchemy
)

# --- Функция для создания таблиц ---
def create_db_and_tables():
    print("--- Попытка создания таблиц в БД (если они не существуют) ---")
    try:
        Base.metadata.create_all(bind=engine)
        # Обновленное сообщение об успехе
        print("--- Таблицы успешно проверены/созданы (поле updated_at в chats добавлено/проверено) ---")
    except Exception as e:
        print(f"--- ОШИБКА при создании таблиц: {e} ---")

# --- ВАЖНОЕ НАПОМИНАНИЕ ---
# Если база данных 'data/chats.db' уже существует, это изменение (добавление колонки updated_at)
# НЕ БУДЕТ применено автоматически при простом запуске.
# САМЫЙ ПРОСТОЙ ПУТЬ (ДЛЯ РАЗРАБОТКИ):
# 1. Остановите приложение (если запущено).
# 2. Удалите файл 'data/chats.db'.
# 3. Запустите приложение снова. Таблицы создадутся с новой структурой.
# ВНИМАНИЕ: ЭТО УДАЛИТ ВСЕ ВАШИ СТАРЫЕ ЧАТЫ!