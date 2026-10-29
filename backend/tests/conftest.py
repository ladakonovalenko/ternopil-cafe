"""Спільне налаштування тестів.

Модулі app.* читають змінні середовища ПІД ЧАС імпорту (os.environ["..."]),
тому тестові значення треба виставити ДО першого імпорту app. Жодних
реальних ключів і жодного підключення до бази тут немає — тести працюють
повністю офлайн.
"""
import os

os.environ.setdefault("DATABASE_URL", "postgresql://test:test@localhost:5432/test")
os.environ.setdefault("ADMIN_API_KEY", "test-admin-key")
os.environ.setdefault("IP_HASH_SALT", "test-salt")
os.environ.setdefault("GEMINI_API_KEY", "test-gemini-key")
os.environ.setdefault("CLOUDINARY_API_KEY", "test-cloudinary-key")
os.environ.setdefault("CLOUDINARY_API_SECRET", "test-cloudinary-secret")
os.environ.setdefault("CLOUDINARY_CLOUD_NAME", "test-cloud")
os.environ.pop("VERCEL_ENV", None)

import httpx
import pytest

from app.main import app
from app.routers import venues


@pytest.fixture
def no_db_rate_limit(monkeypatch):
    """check_admin спершу йде в базу за rate-limit лічильником. У тестах
    бази немає, тож замінюємо цей крок порожньою функцією — сама перевірка
    ключа (те, що ми тестуємо) лишається справжньою."""

    async def _noop(*args, **kwargs):
        return None

    monkeypatch.setattr(venues, "_rate_limit", _noop)


@pytest.fixture
async def client():
    transport = httpx.ASGITransport(app=app)
    async with httpx.AsyncClient(transport=transport, base_url="http://test") as c:
        yield c
