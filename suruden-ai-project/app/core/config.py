# app/core/config.py
import os
from dotenv import load_dotenv
from pydantic_settings import BaseSettings, SettingsConfigDict
from pydantic import Field, ValidationError # Import ValidationError
from typing import List, Optional, Dict, Set # Added Set

# --- Шаг 1: Загружаем .env файл вручную ---
# Определяем путь к корневой папке проекта относительно текущего файла config.py
# config.py -> app/core -> app -> project_root
project_root = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
dotenv_path = os.path.join(project_root, '.env')

# load_dotenv() вернет True, если файл найден и загружен, False иначе
if load_dotenv(dotenv_path=dotenv_path):
    print(f"Загружен .env файл из: {dotenv_path}")
else:
    print(f"ПРЕДУПРЕЖДЕНИЕ: .env файл не найден по пути: {dotenv_path}")
    # Вы можете решить, критично ли это. Если да, можно выбросить исключение:
    # raise FileNotFoundError(f".env file not found at {dotenv_path}")

# --- Шаг 2: Определяем модель Settings ---
# Pydantic-settings теперь будет читать ВСЕ переменные из .env / окружения
class Settings(BaseSettings):
    # Поля, которые должны быть загружены pydantic-settings
    voidai_api_keys_str: str = Field(alias='VOIDAI_API_KEYS')
    available_models: str = Field(alias='AVAILABLE_MODELS') # Убедимся что алиас указан явно
    voidai_base_url: str = Field(alias='VOIDAI_BASE_URL')
    telegram_bot_token: Optional[str] = Field(alias='TELEGRAM_BOT_TOKEN', default=None)
    telegram_admin_ids_str: Optional[str] = Field(alias='TELEGRAM_ADMIN_IDS', default=None)
    database_url: str = Field(alias='DATABASE_URL')
    secret_key: str = Field(alias='SECRET_KEY')
    host: str = Field(alias='HOST', default="127.0.0.1")
    port: int = Field(alias='PORT', default=8000)
    # Новое поле для моделей без стриминга
    voidai_non_streaming_models_str: Optional[str] = Field(alias='VOIDAI_NON_STREAMING_MODELS', default="")

    model_config = SettingsConfigDict(
        env_file=dotenv_path, # Указываем путь явно еще раз для pydantic-settings
        env_file_encoding='utf-8',
        extra='ignore' # Игнорировать лишние переменные в .env
    )

# --- Шаг 3: Инициализируем Settings ---
try:
    settings = Settings()
    print("--- Настройки (Settings) успешно инициализированы ---")
except ValidationError as e:
    print(f"КРИТИЧЕСКАЯ ОШИБКА при инициализации настроек (Settings): {e}")
    print("Убедитесь, что файл .env существует, содержит все необходимые переменные и имеет правильный формат.")
    # Выбрасываем исключение, чтобы остановить запуск приложения, если настройки не загружены
    raise SystemExit(f"Failed to load settings: {e}")
except Exception as e:
    print(f"КРИТИЧЕСКАЯ НЕПРЕДВИДЕННАЯ ОШИБКА при инициализации настроек (Settings): {e}")
    raise SystemExit(f"Unexpected error loading settings: {e}")


# --- Шаг 4: Парсим списки ключей и ID из загруженных настроек ---

# Парсим VOIDAI_API_KEYS
VOIDAI_API_KEYS_LIST: List[str] = []
if settings.voidai_api_keys_str:
    try:
        VOIDAI_API_KEYS_LIST = [
            key.strip() for key in settings.voidai_api_keys_str.split(',') if key.strip()
        ]
        if not VOIDAI_API_KEYS_LIST:
             print("ПРЕДУПРЕЖДЕНИЕ: VOIDAI_API_KEYS в .env указаны, но после обработки список пуст.")
    except Exception as e:
        print(f"ПРЕДУПРЕЖДЕНИЕ: Ошибка парсинга VOIDAI_API_KEYS_STR: {e}.")
else:
    # Это поле в Settings обязательное (str, не Optional[str])
    # Эта ветка не должна выполниться, если Settings инициализировался без ошибки валидации
    print("КРИТИЧЕСКАЯ ОШИБКА: VOIDAI_API_KEYS_STR пусто после инициализации Settings, хотя оно обязательно.")


# Парсим TELEGRAM_ADMIN_IDS
TELEGRAM_ADMIN_IDS_LIST: List[int] = []
if settings.telegram_admin_ids_str: # Проверяем, что строка не None и не пустая
    try:
        TELEGRAM_ADMIN_IDS_LIST = [
            int(id_str.strip()) for id_str in settings.telegram_admin_ids_str.split(',') if id_str.strip()
        ]
        if not TELEGRAM_ADMIN_IDS_LIST:
            print("ПРЕДУПРЕЖДЕНИЕ: TELEGRAM_ADMIN_IDS в .env указаны, но после обработки список пуст.")
    except ValueError as e:
        print(f"ПРЕДУПРЕЖДЕНИЕ: Ошибка парсинга TELEGRAM_ADMIN_IDS_STR: {e}. Убедитесь, что все ID являются числами.")
        TELEGRAM_ADMIN_IDS_LIST = [] # Оставляем пустым списком в случае ошибки
    except Exception as e:
        print(f"ПРЕДУПРЕЖДЕНИЕ: Неожиданная ошибка парсинга TELEGRAM_ADMIN_IDS_STR: {e}")
        TELEGRAM_ADMIN_IDS_LIST = []
# else: # Если строка пустая или None (т.к. поле Optional) - это нормально
#    print("Информация: TELEGRAM_ADMIN_IDS не указаны или пусты.")


# --- Шаг 5: Парсим AVAILABLE_MODELS ---
def parse_models(models_str: Optional[str]) -> Dict[str, str]:
    models_dict = {}
    if not models_str:
        print("ПРЕДУПРЕЖДЕНИЕ: Строка AVAILABLE_MODELS пуста.")
        return models_dict
    try:
        pairs = models_str.split(',')
        for pair in pairs:
            if ':' in pair:
                parts = pair.split(':', 1)
                name = parts[0].strip()
                endpoint = parts[1].strip()
                if name and endpoint:
                    # Ключ - endpoint, Значение - name
                    models_dict[endpoint] = name
                else:
                    print(f"ПРЕДУПРЕЖДЕНИЕ: Пропуск некорректной пары в AVAILABLE_MODELS: '{pair}'")
            else:
                print(f"ПРЕДУПРЕЖДЕНИЕ: Пропуск некорректной записи в AVAILABLE_MODELS (нет ':'): '{pair}'")
    except Exception as e:
        print(f"КРИТИЧЕСКАЯ ОШИБКА парсинга AVAILABLE_MODELS: {e}. Строка: '{models_str}'")
        return {}
    if not models_dict:
        print("ПРЕДУПРЕЖДЕНИЕ: AVAILABLE_MODELS указаны, но после парсинга словарь моделей пуст.")
    return models_dict

AVAILABLE_MODELS_DICT: Dict[str, str] = parse_models(settings.available_models)


# --- Шаг 5.1: Парсим VOIDAI_NON_STREAMING_MODELS ---
NON_STREAMING_MODELS_SET: Set[str] = set()
if settings.voidai_non_streaming_models_str:
    try:
        NON_STREAMING_MODELS_SET = {
            model_id.strip() for model_id in settings.voidai_non_streaming_models_str.split(',')
            if model_id.strip()
        }
        # Проверяем, что указанные модели существуют в AVAILABLE_MODELS_DICT
        invalid_models_in_non_streaming_list = NON_STREAMING_MODELS_SET - set(AVAILABLE_MODELS_DICT.keys())
        if invalid_models_in_non_streaming_list:
            print(f"ПРЕДУПРЕЖДЕНИЕ: Следующие модели из VOIDAI_NON_STREAMING_MODELS не найдены в AVAILABLE_MODELS и будут проигнорированы: {invalid_models_in_non_streaming_list}")
            NON_STREAMING_MODELS_SET -= invalid_models_in_non_streaming_list # Удаляем невалидные
    except Exception as e:
        print(f"ПРЕДУПРЕЖДЕНИЕ: Ошибка парсинга VOIDAI_NON_STREAMING_MODELS: {e}.")
        NON_STREAMING_MODELS_SET = set()
else:
     print("Информация: Список VOIDAI_NON_STREAMING_MODELS не задан или пуст. Стриминг будет включен для всех моделей по умолчанию (если поддерживается).")


# --- Шаг 6: Вывод загруженных настроек для проверки ---
print("--- Загруженные настройки (config.py) ---")
print(f"VoidAI Base URL: {settings.voidai_base_url}")
print(f"Database URL: {settings.database_url}")
print(f"Host: {settings.host}")
print(f"Port: {settings.port}")
print(f"Количество API ключей VoidAI: {len(VOIDAI_API_KEYS_LIST)}")
print(f"Telegram Admin IDs: {TELEGRAM_ADMIN_IDS_LIST}")
print(f"Доступные модели (endpoint: name): {AVAILABLE_MODELS_DICT}")
print(f"Модели с ОТКЛЮЧЕННЫМ стримингом: {NON_STREAMING_MODELS_SET if NON_STREAMING_MODELS_SET else 'Нет'}")
# Не логгируем секретные ключи (SECRET_KEY, TELEGRAM_BOT_TOKEN, VOIDAI_API_KEYS_LIST)
print("-----------------------------------------")

# Переинициализация состояния ключей после возможного изменения .env
# Импортируем здесь, чтобы избежать циклических зависимостей на старте
try:
    from app.services.voidai_service import initialize_key_state
    initialize_key_state() # Обновляем состояние ключей в сервисе
    print("--- Состояние ключей в voidai_service переинициализировано ---")
except ImportError:
    print("ПРЕДУПРЕЖДЕНИЕ: Не удалось импортировать initialize_key_state из voidai_service для переинициализации.")
except Exception as e:
     print(f"ОШИБКА при переинициализации состояния ключей в voidai_service: {e}")