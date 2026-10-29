import importlib

import httpx

import app.main as main_module


async def _get_status(path):
    transport = httpx.ASGITransport(app=main_module.app)
    async with httpx.AsyncClient(transport=transport, base_url="http://test") as c:
        return (await c.get(path)).status_code


async def test_docs_hidden_in_production(monkeypatch):
    monkeypatch.setenv("VERCEL_ENV", "production")
    importlib.reload(main_module)
    try:
        assert await _get_status("/docs") == 404
        assert await _get_status("/openapi.json") == 404
    finally:
        monkeypatch.delenv("VERCEL_ENV", raising=False)
        importlib.reload(main_module)


async def test_docs_available_outside_production():
    assert await _get_status("/docs") == 200
