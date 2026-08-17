import hashlib
import os
from fastapi import APIRouter, Header, HTTPException, Request
from app.database import get_connection
from app.models import ReviewIn, ReviewOut
from app.routers.venues import check_admin

router = APIRouter(prefix="/venues/{venue_id}/reviews", tags=["reviews"])

IP_SALT = os.environ.get("IP_HASH_SALT", "change-me")
RATE_LIMIT_HOURS = 24  # одна людина — один відгук на заклад за добу


def hash_ip(ip: str) -> str:
    return hashlib.sha256(f"{IP_SALT}{ip}".encode()).hexdigest()


def get_client_ip(request: Request) -> str:
    """На Vercel (і будь-якому проксі/edge) request.client.host часто показує
    IP проксі, не кінцевого відвідувача — реальний IP зазвичай у заголовку
    X-Forwarded-For. Цей заголовок може містити ланцюжок IP через кому
    (кожен проксі на шляху дописує своє) — перший у списку і є оригінальним
    клієнтом, тому беремо саме його, а не весь рядок як є (інакше хеш
    виходив би різним для тієї самої людини щоразу, і rate-limit не
    працював би)."""
    forwarded = request.headers.get("x-forwarded-for")
    if forwarded:
        return forwarded.split(",")[0].strip()
    return request.client.host if request.client else "unknown"


@router.get("", response_model=list[ReviewOut])
async def list_reviews(venue_id: int):
    conn = await get_connection()
    try:
        rows = await conn.fetch(
            "SELECT id, venue_id, author_name, rating, comment, created_at "
            "FROM reviews WHERE venue_id = $1 ORDER BY created_at DESC",
            venue_id,
        )
        return [dict(row) for row in rows]
    finally:
        await conn.close()


@router.post("", response_model=ReviewOut, status_code=201)
async def create_review(venue_id: int, review: ReviewIn, request: Request):
    # Honeypot: якщо приховане поле заповнене — це бот, тихо відхиляємо.
    if review.website:
        raise HTTPException(status_code=400, detail="Помилка валідації")

    client_ip = get_client_ip(request)
    ip_hash = hash_ip(client_ip)

    conn = await get_connection()
    try:
        venue_exists = await conn.fetchval("SELECT 1 FROM venues WHERE id=$1", venue_id)
        if not venue_exists:
            raise HTTPException(status_code=404, detail="Заклад не знайдено")

        recent = await conn.fetchval(
            """
            SELECT 1 FROM reviews
            WHERE venue_id=$1 AND ip_hash=$2
              AND created_at > now() - make_interval(hours => $3)
            """,
            venue_id, ip_hash, RATE_LIMIT_HOURS,
        )
        if recent:
            raise HTTPException(
                status_code=429,
                detail="Ви вже залишали відгук для цього закладу нещодавно",
            )

        row = await conn.fetchrow(
            """
            INSERT INTO reviews (venue_id, author_name, rating, comment, ip_hash)
            VALUES ($1,$2,$3,$4,$5)
            RETURNING id, venue_id, author_name, rating, comment, created_at
            """,
            venue_id, review.author_name, review.rating, review.comment, ip_hash,
        )

        # Перерахунок середнього рейтингу закладу
        await conn.execute(
            """
            UPDATE venues SET
                avg_rating = (SELECT ROUND(AVG(rating)::numeric, 1) FROM reviews WHERE venue_id=$1),
                reviews_count = (SELECT COUNT(*) FROM reviews WHERE venue_id=$1)
            WHERE id=$1
            """,
            venue_id,
        )
        return dict(row)
    finally:
        await conn.close()


@router.delete("/{review_id}", status_code=204)
async def delete_review(
    venue_id: int,
    review_id: int,
    request: Request,
    x_admin_key: str | None = Header(default=None),
):
    """Видалення відгуку — тільки для тебе, той самий адмін-ключ і
    rate-limit, що й на закладах."""
    check_admin(x_admin_key, request)

    conn = await get_connection()
    try:
        result = await conn.execute(
            "DELETE FROM reviews WHERE id=$1 AND venue_id=$2", review_id, venue_id
        )
        if result == "DELETE 0":
            raise HTTPException(status_code=404, detail="Відгук не знайдено")

        # Перерахунок середнього рейтингу після видалення — той самий
        # запит, що й при створенні, просто тепер AVG може стати NULL,
        # якщо це був останній відгук, COALESCE підстрахує нулем.
        await conn.execute(
            """
            UPDATE venues SET
                avg_rating = COALESCE((SELECT ROUND(AVG(rating)::numeric, 1) FROM reviews WHERE venue_id=$1), 0),
                reviews_count = (SELECT COUNT(*) FROM reviews WHERE venue_id=$1)
            WHERE id=$1
            """,
            venue_id,
        )
    finally:
        await conn.close()
