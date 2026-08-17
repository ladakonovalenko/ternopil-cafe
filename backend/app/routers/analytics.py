import hashlib
import os
from fastapi import APIRouter, Header, HTTPException, Request
from app.database import get_connection
from app.routers.venues import check_admin

router = APIRouter(prefix="/analytics", tags=["analytics"])

IP_SALT = os.environ["IP_HASH_SALT"]

# bucket-одиниця в SQL + вікно часу — контрольований словник, не з
# користувацького вводу напряму (period звіряється зі списком нижче
# ДО того, як ці значення підуть у SQL-рядок), тож безпечно.
PERIOD_CONFIG = {
    "day": ("hour", "24 hours"),
    "week": ("day", "7 days"),
    "month": ("day", "30 days"),
    "year": ("month", "12 months"),
}


def _get_client_ip(request: Request) -> str:
    forwarded = request.headers.get("x-forwarded-for")
    if forwarded:
        return forwarded.split(",")[0].strip()
    return request.client.host if request.client else "unknown"


def _hash_ip(ip: str) -> str:
    return hashlib.sha256(f"{IP_SALT}{ip}".encode()).hexdigest()


@router.post("/pageview", status_code=204)
async def log_pageview(request: Request):
    """Публічний, анонімний облік відвідувань — тільки хеш IP і шлях
    сторінки, без жодних cookies чи персональних даних. Тихо ігнорує
    помилки парсингу тіла запиту, щоб ніколи не заважати звичайному
    перегляду сайту."""
    try:
        body = await request.json()
    except Exception:
        body = {}
    path = str((body or {}).get("path", "/"))[:300]
    ip_hash = _hash_ip(_get_client_ip(request))

    conn = await get_connection()
    try:
        await conn.execute(
            "INSERT INTO page_views (path, ip_hash) VALUES ($1, $2)", path, ip_hash
        )
    finally:
        await conn.close()


@router.get("/stats")
async def get_stats(period: str, request: Request, x_admin_key: str | None = Header(default=None)):
    """Статистика відвідувань — тільки для тебе. Ліміти на цей ендпоінт —
    той самий rate-limit, що й на решті адмін-дій (через check_admin)."""
    check_admin(x_admin_key, request)

    if period not in PERIOD_CONFIG:
        raise HTTPException(status_code=400, detail="period має бути day/week/month/year")

    bucket_unit, interval = PERIOD_CONFIG[period]

    conn = await get_connection()
    try:
        rows = await conn.fetch(
            f"""
            SELECT date_trunc('{bucket_unit}', created_at) AS bucket,
                   COUNT(*) AS views,
                   COUNT(DISTINCT ip_hash) AS visitors
            FROM page_views
            WHERE created_at > now() - interval '{interval}'
            GROUP BY bucket
            ORDER BY bucket
            """
        )
        totals = await conn.fetchrow(
            f"""
            SELECT COUNT(*) AS views, COUNT(DISTINCT ip_hash) AS visitors
            FROM page_views
            WHERE created_at > now() - interval '{interval}'
            """
        )
    finally:
        await conn.close()

    return {
        "total_views": totals["views"] or 0,
        "total_visitors": totals["visitors"] or 0,
        "buckets": [
            {
                "date": row["bucket"].isoformat(),
                "views": row["views"],
                "visitors": row["visitors"],
            }
            for row in rows
        ],
    }
