#!/usr/bin/env python3

import os
import sys
import subprocess
import platform

def main():
    """Activate virtual environment and start Uvicorn."""
    base_dir = os.path.dirname(os.path.abspath(__file__))
    
    # Определяем пути к виртуальному окружению
    if sys.platform == "win32":
        venv_activate = os.path.join(base_dir, "venv", "Scripts", "activate.bat")
        python_exe = os.path.join(base_dir, "venv", "Scripts", "python.exe")
        uvicorn_exe = os.path.join(base_dir, "venv", "Scripts", "uvicorn.exe")
    else:
        venv_activate = os.path.join(base_dir, "venv", "bin", "activate")
        python_exe = os.path.join(base_dir, "venv", "bin", "python")
        uvicorn_exe = os.path.join(base_dir, "venv", "bin", "uvicorn")
    
    # Проверяем существование виртуального окружения
    if not os.path.exists(python_exe):
        print(f"Ошибка: Виртуальное окружение не найдено. Убедитесь, что venv создан.")
        print(f"Ожидаемый путь: {python_exe}")
        sys.exit(1)
    
    # Устанавливаем переменные окружения для активации venv
    env = os.environ.copy()
    if sys.platform == "win32":
        env["PATH"] = os.path.join(base_dir, "venv", "Scripts") + os.pathsep + env.get("PATH", "")
    else:
        env["PATH"] = os.path.join(base_dir, "venv", "bin") + os.pathsep + env.get("PATH", "")
    env["VIRTUAL_ENV"] = os.path.join(base_dir, "venv")
    
    # Удаляем PYTHONHOME если установлен (может вызывать конфликты)
    env.pop("PYTHONHOME", None)
    
    # Команда для запуска uvicorn
    if os.path.exists(uvicorn_exe):
        # Используем uvicorn напрямую если он установлен как исполняемый файл
        command = [uvicorn_exe, "app.main:app", "--reload", "--host", "127.0.0.1", "--port", "8000"]
    else:
        # Используем python -m uvicorn как запасной вариант
        command = [python_exe, "-m", "uvicorn", "app.main:app", "--reload", "--host", "127.0.0.1", "--port", "8000"]
    
    print(f"Запуск сервера...")
    print(f"Команда: {' '.join(command)}")
    
    try:
        # Запускаем процесс с правильным окружением
        subprocess.run(command, env=env, check=True)
    except subprocess.CalledProcessError as e:
        print(f"Ошибка: Uvicorn завершился с кодом {e.returncode}")
        sys.exit(e.returncode)
    except KeyboardInterrupt:
        print("\nСервер остановлен.")
        sys.exit(0)

if __name__ == "__main__":
    main()