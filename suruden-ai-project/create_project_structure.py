import os
import sys
from pathlib import Path
from PyQt5.QtWidgets import QApplication, QFileDialog, QMessageBox

# Определение необходимой структуры проекта (относительно выбранной папки)
# Папки указываются со слешем в конце '/'
# Файлы указываются без слеша
PROJECT_STRUCTURE = [
    "app/",
    "app/__init__.py",
    "app/main.py",
    "app/routers/",
    "app/routers/__init__.py",
    "app/core/",
    "app/core/__init__.py",
    "app/crud/",
    "app/crud/__init__.py",
    "app/models/",
    "app/models/__init__.py",
    "app/schemas/",
    "app/schemas/__init__.py",
    "app/services/",
    "app/services/__init__.py",
    "app/db/",
    "app/db/__init__.py",
    "app/static/",
    "app/static/css/",
    "app/static/js/",
    "app/static/img/",
    "app/static/img/icons/",
    "app/static/fonts/",
    "app/static/fonts/Figtree/",
    "app/templates/",
    "telegram_bot/",
    "telegram_bot/__init__.py",
    "telegram_bot/bot.py",
    "telegram_bot/handlers/",
    "telegram_bot/handlers/__init__.py",
    "telegram_bot/services/",
    "telegram_bot/services/__init__.py",
    "data/",
    ".env",
    ".gitignore",
    "README.md",
]

def create_structure(base_path):
    """Создает папки и пустые файлы согласно PROJECT_STRUCTURE."""
    created_count = 0
    skipped_count = 0
    print(f"Создание структуры в папке: {base_path}")
    print("-" * 30)

    for item_rel_path in PROJECT_STRUCTURE:
        full_path = Path(base_path) / item_rel_path

        is_file = not item_rel_path.endswith('/')

        if is_file:
            # Это файл
            # Убедимся, что родительская директория существует
            parent_dir = full_path.parent
            if not parent_dir.exists():
                try:
                    parent_dir.mkdir(parents=True, exist_ok=True)
                    print(f"  [Папка создана]: {parent_dir}")
                except Exception as e:
                    print(f"  [Ошибка создания папки {parent_dir}]: {e}")
                    continue # Пропускаем создание файла, если папку не создать

            # Создаем файл, если он не существует
            if not full_path.exists():
                try:
                    full_path.touch()
                    print(f"  [Файл создан]:   {full_path}")
                    created_count += 1
                except Exception as e:
                     print(f"  [Ошибка создания файла {full_path}]: {e}")
            else:
                 print(f"  [Пропущено]:    {full_path} (уже существует)")
                 skipped_count += 1

        else:
            # Это папка
            if not full_path.exists():
                try:
                    full_path.mkdir(parents=True, exist_ok=True)
                    print(f"  [Папка создана]: {full_path}")
                    created_count += 1
                except Exception as e:
                    print(f"  [Ошибка создания папки {full_path}]: {e}")
            else:
                print(f"  [Пропущено]:    {full_path} (уже существует)")
                skipped_count += 1

    print("-" * 30)
    print(f"Завершено. Создано: {created_count}, Пропущено: {skipped_count}")
    return created_count, skipped_count


def select_project_folder():
    """Открывает диалог выбора папки проекта."""
    app = QApplication.instance() # Проверяем, есть ли уже экземпляр
    if app is None: # Если нет, создаем
        app = QApplication(sys.argv)

    options = QFileDialog.Options()
    options |= QFileDialog.ShowDirsOnly
    # options |= QFileDialog.DontUseNativeDialog # Раскомментируй, если стандартный диалог Windows не нравится
    folder_path = QFileDialog.getExistingDirectory(None,
                                                 "Выберите папку проекта (suruden-ai-project)",
                                                 ".", # Начать с текущей директории
                                                 options=options)
    # Важно: QApplication не должен завершаться здесь, если скрипт импортируется
    # app.quit() # Убрано, чтобы избежать проблем при импорте
    return folder_path


if __name__ == "__main__":
    project_path = select_project_folder()

    if project_path:
        # Убедимся, что выбрана правильная папка (хотя бы по имени)
        if os.path.basename(project_path) != 'suruden-ai-project':
             reply = QMessageBox.warning(None, "Внимание",
                                          f"Вы выбрали папку:\n{project_path}\n\n"
                                          f"Она не называется 'suruden-ai-project'. Вы уверены, что хотите создать структуру здесь?",
                                          QMessageBox.Yes | QMessageBox.No, QMessageBox.No)
             if reply == QMessageBox.No:
                 print("Отменено пользователем.")
                 sys.exit() # Выход из скрипта

        create_structure(project_path)
        QMessageBox.information(None, "Завершено", f"Структура проекта создана/обновлена в:\n{project_path}")

    else:
        print("Папка не выбрана. Операция отменена.")

    # Убедимся, что приложение Qt завершает работу корректно
    # sys.exit(QApplication.instance().exec_()) # Это нужно, если бы было окно, но здесь можно и проще
    sys.exit() # Просто выходим