import pytest
from fastapi import HTTPException

from app.rate_limit import check_rate_limit_db


class FakeConn:
    """Підміна з'єднання з базою: кожен виклик fetchrow повертає лічильник,
    що росте на 1 — так само, як це робить справжній SQL UPSERT.
    Тестується логіка порівняння з лімітом, а НЕ сам SQL (для цього
    потрібна справжня Postgres)."""

    def __init__(self):
        self.count = 0

    async def fetchrow(self, query, key, window_seconds):
        self.count += 1
        return {"count": self.count}


async def test_requests_within_limit_pass():
    conn = FakeConn()
    for _ in range(5):
        await check_rate_limit_db(conn, "test:key", 60, 5)


async def test_request_over_limit_gets_429():
    conn = FakeConn()
    for _ in range(5):
        await check_rate_limit_db(conn, "test:key", 60, 5)
    with pytest.raises(HTTPException) as exc:
        await check_rate_limit_db(conn, "test:key", 60, 5)
    assert exc.value.status_code == 429
