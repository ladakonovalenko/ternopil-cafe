import hashlib

ADMIN_KEY = "test-admin-key"


async def test_health_is_public(client):
    r = await client.get("/health")
    assert r.status_code == 200
    assert r.json() == {"status": "ok"}


async def test_admin_verify_without_key_is_403(client, no_db_rate_limit):
    r = await client.get("/admin/verify")
    assert r.status_code == 403


async def test_admin_verify_wrong_key_is_403(client, no_db_rate_limit):
    r = await client.get("/admin/verify", headers={"X-Admin-Key": "wrong-key"})
    assert r.status_code == 403


async def test_admin_verify_correct_key_is_200(client, no_db_rate_limit):
    r = await client.get("/admin/verify", headers={"X-Admin-Key": ADMIN_KEY})
    assert r.status_code == 200
    assert r.json() == {"valid": True}


async def test_analytics_stats_requires_key(client, no_db_rate_limit):
    r = await client.get("/analytics/stats", params={"period": "day"})
    assert r.status_code == 403


async def test_upload_signature_requires_key(client, no_db_rate_limit):
    r = await client.post("/venues/upload-signature")
    assert r.status_code == 403


async def test_upload_signature_restricts_formats(client, no_db_rate_limit):
    """Регресія для фіксу з аудиту: allowed_formats має бути і у відповіді,
    і ВХОДИТИ в підписаний рядок — інакше Cloudinary не зможе відхилити
    файл не того формату."""
    r = await client.post("/venues/upload-signature", headers={"X-Admin-Key": ADMIN_KEY})
    assert r.status_code == 200
    data = r.json()
    assert data["allowed_formats"] == "jpg,jpeg,png,webp"

    to_sign = (
        f"allowed_formats={data['allowed_formats']}"
        f"&folder={data['folder']}&timestamp={data['timestamp']}"
        "test-cloudinary-secret"
    )
    assert data["signature"] == hashlib.sha1(to_sign.encode("utf-8")).hexdigest()
