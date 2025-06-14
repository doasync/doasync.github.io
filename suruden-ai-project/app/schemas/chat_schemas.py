import datetime
from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any # Добавили Dict, Any

# --- Схемы для Сообщений ---\

# Базовая схема сообщения (общие поля)
class MessageBase(BaseModel):
    role: str = Field(..., examples=["user", "assistant"]) # Роль обязательна
    content: str = Field(..., examples=["Привет! Как дела?"]) # Содержимое обязательно

# Схема для создания нового сообщения (наследуется от базовой)
# Дополнительных полей для создания от пользователя не нужно
class MessageCreate(MessageBase):
    pass # Нет дополнительных полей

# Схема для чтения сообщения (включая поля из БД или временные)
class Message(MessageBase):
    # ID может быть None для временных сообщений перед отправкой/после получения
    id: Optional[int] = Field(None, description="ID сообщения из БД (null для временных)")
    # *** ИЗМЕНЕНИЕ: chat_id теперь всегда Optional[int], т.к. у временных он может быть 0 или None ***
    chat_id: Optional[int] = Field(None, description="ID чата из БД (0 или null для временных)")
    timestamp: datetime.datetime = Field(..., description="Время создания сообщения")
    ai_model_name: Optional[str] = Field(None, description="Модель AI, если роль assistant")
    # *** НОВОЕ ПОЛЕ: Временный ID для фронтенда ***
    temp_id: Optional[str] = Field(None, description="Временный ID для UI в режиме инкогнито")

    # Конфигурация для работы с ORM (SQLAlchemy) и генерации примеров
    class Config:
        from_attributes = True # Позволяет читать из атрибутов SQLAlchemy
        model_config = {'protected_namespaces': ()} # ИЗМЕНЕНИЕ: Добавлено для Pydantic v2
        # Добавляем примеры для Swagger/OpenAPI
        json_schema_extra = {
            "examples": [
                {
                    "id": 101,
                    "chat_id": 20,
                    "role": "user",
                    "content": "Объясни квантовую физику.",
                    "timestamp": "2024-08-15T10:30:00Z",
                    "ai_model_name": None,
                    "temp_id": None
                },
                {
                    "id": 102,
                    "chat_id": 20,
                    "role": "assistant",
                    "content": "Квантовая физика изучает...",
                    "timestamp": "2024-08-15T10:30:05Z",
                    "ai_model_name": "gpt-4o",
                    "temp_id": None
                },
                { # Пример временного сообщения (как может выглядеть)
                    "id": None,
                    "chat_id": 0, # Может быть 0
                    "role": "user",
                    "content": "Это временное сообщение",
                    "timestamp": "2024-08-15T11:00:00Z",
                    "ai_model_name": None,
                    "temp_id": "temp-1692108000000-user" # Пример временного ID
                }
            ]
        }


# --- Схемы для Чатов ---\

# Базовая схема чата
class ChatBase(BaseModel):
    title: Optional[str] = Field("Новый чат", max_length=100) # Необязательное название при создании

# Схема для создания нового чата
class ChatCreate(ChatBase):
   initial_message: Optional[MessageCreate] = Field(None, description="Начальное сообщение пользователя (опционально)")
   is_temporary: bool = Field(False, description="Флаг временного чата (не сохраняется в БД)") # ИЗМЕНЕНО: сделал обязательным

# Схема для обновления чата (например, переименования, архивации)
class ChatUpdate(BaseModel):
    title: Optional[str] = Field(None, max_length=100, description="Новое название чата")

# Схема для чтения информации о чате (без сообщений, для списка чатов)
class ChatInfo(ChatBase):
    id: int # У постоянного чата всегда есть ID
    created_at: datetime.datetime

    class Config:
        from_attributes = True

# Схема для чтения полного чата (включая все сообщения)
class Chat(ChatInfo):
    messages: List[Message] = Field([], description="Список сообщений в чате") # Список сообщений

    class Config:
        from_attributes = True
        json_schema_extra = { # Пример для Swagger
             "example": {
                 "id": 5,
                 "title": "Обсуждение FastAPI",
                 "created_at": "2024-08-14T15:00:00Z",
                 # "archived": False, # Убрано, если архивация не реализована
                 "messages": [
                     {"id": 10, "chat_id": 5, "role": "user", "content": "Как работает Depends?", "timestamp": "2024-08-14T15:01:00Z", "ai_model_name": None, "temp_id": None},
                     {"id": 11, "chat_id": 5, "role": "assistant", "content": "Depends() используется для...", "timestamp": "2024-08-14T15:01:05Z", "ai_model_name": "o3-high", "temp_id": None},
                 ]
             }
        }
# --- НОВАЯ СХЕМА для ответа эндпоинта /completion ---\
class ChatCompletionResponse(BaseModel):
    user_message: Message # The saved or temporary user message object
    assistant_message: Message # The generated assistant message object

    class Config: # Add example for Swagger
        from_attributes = True # Important if validating from SQLAlchemy models directly somewhere else
        json_schema_extra = {
            "example": {
                "user_message": {
                    "id": 101, # Может быть null для временных
                    "chat_id": 20, # Может быть 0 для временных
                    "role": "user",
                    "content": "Explain quantum physics.",
                    "timestamp": "2024-08-15T10:30:00Z",
                    "ai_model_name": None,
                    "temp_id": "temp-123-user" # Пример temp_id
                },
                "assistant_message": {
                    "id": 102, # Может быть null для временных
                    "chat_id": 20, # Может быть 0 для временных
                    "role": "assistant",
                    "content": "Quantum physics studies...",
                    "timestamp": "2024-08-15T10:30:05Z",
                    "ai_model_name": "gpt-4o",
                    "temp_id": "temp-123-assistant" # Пример temp_id
                }
            }
        }

# Схема для ответа AI (если нужен был бы отдельный)
# class AIChatResponse(BaseModel):
#    response: str

# --- Схема для тела запроса /completion ---\
class ChatCompletionRequestBody(BaseModel):
    ai_model_id: str = Field(..., description="ID модели AI для использования (например, 'gpt-4o')", examples=["gpt-4o", "o3-high"])
    message_data: MessageCreate = Field(..., description="Сообщение пользователя (role='user')")
    is_temporary: bool = Field(False, description="Флаг временного чата/сообщения")
    # *** НОВОЕ ПОЛЕ: Опциональная история для временных чатов ***
    history: Optional[List[Dict[str, str]]] = Field(None, description="История сообщений для временного чата (только role и content)")
    # *** НОВОЕ ПОЛЕ: Временный ID сообщения пользователя ***
    user_temp_id: Optional[str] = Field(None, description="Временный ID сообщения пользователя, отправляемого фронтендом")
    # *** НОВОЕ ПОЛЕ: Настройка стриминга от пользователя ***
    streaming: bool = Field(True, description="Включить ли стриминг ответа (по умолчанию True)")


    class Config: # Добавляем Config для примера в Swagger
        json_schema_extra = {
            "example": {
                "ai_model_id": "gpt-4o",
                "message_data": {
                    "role": "user",
                    "content": "Привет, мир!"
                },
                "is_temporary": True,
                "history": [
                    {"role": "user", "content": "Предыдущий вопрос?"},
                    {"role": "assistant", "content": "Предыдущий ответ."}
                ],
                 "user_temp_id": "temp-1692108000000-user",
                 "streaming": True
            }
        }