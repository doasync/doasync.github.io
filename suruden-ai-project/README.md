# Suruden AI Project

Веб-приложение для работы с AI моделями через VoidAI API с поддержкой чатов, стриминга и Telegram бота.

## Возможности

- 🤖 Поддержка множественных AI моделей (GPT, Claude, Gemini, Grok и др.)
- 💬 Веб-интерфейс для чатов с AI
- 🔄 Стриминг ответов в реальном времени
- 📱 Telegram бот (в разработке)
- 💾 Сохранение истории чатов в SQLite
- 🎨 Современный веб-интерфейс с поддержкой Markdown
- ⚡ Асинхронная архитектура на FastAPI

## Установка и настройка

### 1. Клонирование репозитория

```bash
git clone <repository-url>
cd suruden-ai-project
```

### 2. Создание виртуального окружения

```bash
python -m venv venv

# Windows
venv\Scripts\activate

# Linux/macOS
source venv/bin/activate
```

### 3. Установка зависимостей

```bash
pip install -r requirements.txt
```

### 4. Настройка переменных окружения

Скопируйте файл `.env.example` в `.env` и заполните необходимые значения:

```bash
cp .env.example .env
```

Отредактируйте `.env` файл:

```env
# Переменные для VoidAI API
VOIDAI_API_KEYS=your_actual_voidai_api_key_here
AVAILABLE_MODELS=Gemini 2.5 Pro:gemini-2.5-pro-preview-03-25,o3-high:o3-high,o4-mini high:o4-mini-high,Grok 3:grok-3-latest,GPT 4.1:gpt-4.1,GPT-4o:chatgpt-4o-latest

# Настройки Telegram Бота (опционально)
TELEGRAM_BOT_TOKEN=your_telegram_bot_token_here
TELEGRAM_ADMIN_IDS=your_telegram_user_id_here

# Секретный ключ FastAPI (сгенерируйте новый!)
SECRET_KEY=your_secret_key_here
```

### 5. Получение API ключей

#### VoidAI API
1. Зарегистрируйтесь на [VoidAI](https://voidai.app)
2. Получите API ключ в личном кабинете
3. Добавьте ключ в переменную `VOIDAI_API_KEYS` в файле `.env`

#### Telegram Bot (опционально)
1. Создайте бота через [@BotFather](https://t.me/BotFather) в Telegram
2. Получите токен бота
3. Узнайте свой Telegram ID через [@userinfobot](https://t.me/userinfobot)
4. Добавьте данные в соответствующие переменные в `.env`

### 6. Генерация секретного ключа

```bash
python -c "import secrets; print(secrets.token_hex(32))"
```

Скопируйте полученный ключ в переменную `SECRET_KEY` в файле `.env`.

## Запуск приложения

### Простой запуск

```bash
python run.py
```

### Ручной запуск через uvicorn

```bash
uvicorn app.main:app --reload --host 127.0.0.1 --port 8000
```

Приложение будет доступно по адресу: http://127.0.0.1:8000

## Структура проекта

```
suruden-ai-project/
├── app/                    # Основное приложение FastAPI
│   ├── core/              # Конфигурация и настройки
│   ├── crud/              # Операции с базой данных
│   ├── db/                # Модели и подключение к БД
│   ├── routers/           # API роутеры
│   ├── schemas/           # Pydantic схемы
│   ├── services/          # Бизнес-логика
│   ├── static/            # Статические файлы (CSS, JS, изображения)
│   └── templates/         # HTML шаблоны
├── telegram_bot/          # Telegram бот (в разработке)
├── data/                  # База данных SQLite
├── .env                   # Переменные окружения (не в Git)
├── .env.example          # Пример конфигурации
├── requirements.txt       # Python зависимости
└── run.py                # Скрипт запуска
```

## Использование

### Веб-интерфейс

1. Откройте http://127.0.0.1:8000 в браузере
2. Выберите AI модель из списка
3. Начните диалог с AI
4. Используйте функции редактирования и регенерации сообщений

### API

Документация API доступна по адресам:
- Swagger UI: http://127.0.0.1:8000/docs
- ReDoc: http://127.0.0.1:8000/redoc

## Разработка

### Добавление новых моделей

Отредактируйте переменную `AVAILABLE_MODELS` в файле `.env`:

```env
AVAILABLE_MODELS=Model Name:model-id,Another Model:another-model-id
```

### Отключение стриминга для моделей

Добавьте ID модели в переменную `VOIDAI_NON_STREAMING_MODELS`:

```env
VOIDAI_NON_STREAMING_MODELS=model-id-1,model-id-2
```

## Безопасность

⚠️ **Важно:**
- Никогда не коммитьте файл `.env` в Git
- Используйте сильные секретные ключи
- Ограничьте доступ к API ключам
- Регулярно обновляйте зависимости

## Лицензия

[Укажите лицензию проекта]

## Поддержка

При возникновении проблем:
1. Проверьте правильность настройки `.env` файла
2. Убедитесь, что все зависимости установлены
3. Проверьте логи приложения
4. Создайте issue в репозитории проекта