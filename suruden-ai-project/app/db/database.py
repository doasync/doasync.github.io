# Файл: app/db/database.py
from sqlalchemy.orm import sessionmaker
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from contextlib import asynccontextmanager
from typing import AsyncGenerator
import asyncio # Import asyncio for lock

from app.core.config import settings

# --- NEW: Async lock for database write operations ---
# This lock should be used by services performing commits/flushes
db_write_lock = asyncio.Lock()
# --- END NEW ---

async_engine = create_async_engine(
    settings.database_url,
    # echo=True, # Uncomment for SQL debugging
    # --- NEW/Optional: Add connect_args for timeout if supported by aiosqlite version ---
    # connect_args={"timeout": 15.0} # Check aiosqlite documentation for exact syntax/support
    # The 'check_same_thread: False' is for the *sync* engine usually.
    # For aiosqlite async, it might not be needed or handled differently.
    # Default behavior is generally safe for async.
    # --- END NEW/Optional ---
)

AsyncSessionFactory = sessionmaker(
    bind=async_engine,
    class_=AsyncSession,
    expire_on_commit=False,
    autocommit=False,
    autoflush=False,
)

async def get_async_db() -> AsyncGenerator[AsyncSession, None]:
    """Dependency function that yields an async session."""
    async with AsyncSessionFactory() as session:
        try:
            yield session
        except Exception:
            await session.rollback()
            raise
        finally:
            await session.close()

@asynccontextmanager
async def get_async_session_context() -> AsyncGenerator[AsyncSession, None]:
    """Context manager for obtaining an async session."""
    async with AsyncSessionFactory() as session:
        try:
            yield session
        except Exception:
            await session.rollback()
            raise
        finally:
            await session.close()

async def create_async_db_and_tables():
    from .models_db import Base
    print("--- Попытка создания таблиц в БД (асинхронно) ---")
    async with async_engine.begin() as conn:
        try:
            await conn.run_sync(Base.metadata.create_all)
            print("--- Таблицы успешно проверены/созданы (асинхронно) ---")
        except Exception as e:
            print(f"--- ОШИБКА при создании таблиц (асинхронно): {e} ---")

print("--- Database setup (database.py) loaded with DB Write Lock ---")