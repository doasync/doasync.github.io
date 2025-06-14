from fastapi import APIRouter
from typing import Dict

# Импортируем наш словарь с моделями из конфигурации
from app.core.config import AVAILABLE_MODELS_DICT

# Создаем новый "маршрутизатор" для системных вещей
router = APIRouter(
    prefix="/api/v1/system", # Пути будут начинаться с /api/v1/system
    tags=["System"],        # Группа в документации API
)

@router.get("/models", response_model=Dict[str, str])
async def get_available_models():
    """
    Возвращает словарь доступных моделей.
    Ключ - ID модели (для API), Значение - Имя модели (для отображения).
    """
    # Просто возвращаем словарь, который мы импортировали
    return AVAILABLE_MODELS_DICT

print("--- API роутер для системных эндпоинтов (модели) создан ---")