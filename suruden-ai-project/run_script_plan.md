# Automating Site Startup

## Plan

1. Create a new script at the project root:
   - Filename: `run.py`

2. In `run.py`, implement logic to:
   - Determine the path to the virtual-environment Python executable.
     - On Windows: `venv\Scripts\python.exe`
     - On macOS/Linux: `venv/bin/python`
   - Verify that this interpreter exists; if not, print an error and exit.
   - Invoke Uvicorn via:
     ```bash
     python -m uvicorn app.main:app --reload
     ```
     using the venv Python, so activation isn’t required.

3. (Optionally) Update `README.md` with a “Usage” section showing:
    ```bash
    python run.py
    ```

4. Verify cross-platform support: Windows and POSIX paths.

5. Provide a Mermaid sequence diagram illustrating the startup flow.

```mermaid
sequenceDiagram
    participant User
    participant run_py as run.py
    participant VenvPy as venv Python
    participant Uvicorn
    User->>run_py: python run.py
    run_py->>VenvPy: locate and launch
    VenvPy->>Uvicorn: -m uvicorn app.main:app --reload
    Uvicorn-->>User: FastAPI server running