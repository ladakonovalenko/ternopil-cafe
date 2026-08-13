import sys
import os

# Дозволяє імпортувати пакет app/ з кореня проекту
sys.path.append(os.path.join(os.path.dirname(__file__), ".."))

from app.main import app  # noqa: E402

# Vercel очікує змінну `app`, сумісну з ASGI — FastAPI підходить напряму.
