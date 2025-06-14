from fastapi import FastAPI, Request # Добавлен Request
import os
from fastapi.responses import HTMLResponse
from fastapi.staticfiles import StaticFiles # Добавлен StaticFiles
from fastapi.templating import Jinja2Templates # Добавлен Jinja2Templates
from contextlib import asynccontextmanager


# Импортируем наши настройки и переменные
from app.core.config import settings, AVAILABLE_MODELS_DICT, VOIDAI_API_KEYS_LIST
# Импортируем функцию для создания таблиц
from app.db.database import create_async_db_and_tables
# Импортируем сервисы
from app.services import voidai_service # Добавили импорт сервиса
# Импортируем роутеры
from app.routers import chat_api
from app.routers import system_api
from app.routers import message_api

# --- Жизненный цикл приложения (Lifespan) ---
@asynccontextmanager
async def lifespan(app: FastAPI):
    # Код выполняемый при старте приложения
    print("--- Приложение запускается ---")
    await create_async_db_and_tables()
    print(f"Доступные модели для API: {list(AVAILABLE_MODELS_DICT.keys())}")
    # Инициализация других сервисов (если нужно) при старте
    yield
    # Код выполняемый при остановке приложения
    print("--- Приложение останавливается ---")
    await voidai_service.close_client() # Закрываем HTTP клиент VoidAI

# --- Создание экземпляра FastAPI ---
app = FastAPI(
    title="Suruden AI",
    description="Бесплатный AI Чат на базе VoidAI API",
    version="0.1.0",
    lifespan=lifespan
)

# --- Монтирование статической директории ---
# Все файлы из папки 'app/static' будут доступны по пути '/static'
# Убедись, что директория 'app/static' существует
try:
    static_dir = os.path.join(os.path.dirname(__file__), "static")
    app.mount("/static", StaticFiles(directory=static_dir), name="static")
    print("--- Статическая директория /static примонтирована ---")
except RuntimeError as e:
    print(f"--- ОШИБКА монтирования статики: {e}. Убедитесь, что папка 'app/static' существует. ---")


# --- Настройка шаблонизатора Jinja2 ---
# Указываем папку, где лежат HTML шаблоны
# Убедись, что директория 'app/templates' существует
try:
    templates_dir = os.path.join(os.path.dirname(__file__), "templates")
    templates = Jinja2Templates(directory=templates_dir)
    print("--- Шаблонизатор Jinja2 настроен ---")
except AssertionError as e:
     print(f"--- ОШИБКА настройки Jinja2: {e}. Убедитесь, что библиотека Jinja2 установлена. ---")
     # Можно добавить sys.exit(1) здесь, если Jinja2 критичен для запуска
except Exception as e:
     print(f"--- НЕПРЕДВИДЕННАЯ ОШИБКА настройки Jinja2: {e}. Убедитесь, что папка 'app/templates' существует. ---")
     # Можно добавить sys.exit(1)

# --- Основной эндпоинт для отдачи HTML страницы ---
@app.get("/", response_class=HTMLResponse)
async def read_root_page(request: Request):
    """Отдает основную HTML страницу чата."""
    try:
        # Передаем объект request в шаблон, это стандартная практика
        return templates.TemplateResponse(
            "index.html", {"request": request, "available_models": AVAILABLE_MODELS_DICT} # Передаем модели в шаблон
        )
    except Exception as e:
        print(f"Ошибка при рендеринге шаблона index.html: {e}")
        # В идеале вернуть кастомную страницу ошибки
        return HTMLResponse("<html><body><h1>Ошибка сервера</h1><p>Не удалось загрузить страницу чата.</p></body></html>", status_code=500)

# --- Подключение роутеров ---
app.include_router(chat_api.router)
app.include_router(system_api.router)
app.include_router(message_api.router)
print("--- API роутеры подключены ---")

print("--- FastAPI приложение полностью сконфигурировано ---")