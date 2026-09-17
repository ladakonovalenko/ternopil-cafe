import hashlib
import hmac
import os
import secrets
from fastapi import APIRouter, Header, HTTPException, Request
from app.database import get_connection
from app.models import ReviewIn, ReviewOut, ReviewCreatedOut, ReviewUpdateIn
from app.routers.venues import check_admin
from app.rate_limit import check_rate_limit_db

router = APIRouter(prefix="/venues/{venue_id}/reviews", tags=["reviews"])

IP_SALT = os.environ["IP_HASH_SALT"]
RATE_LIMIT_HOURS = 24  # одна людина — один відгук на заклад за добу

# Rate-limit на самостійне редагування/видалення — той самий принцип,
# що вже є на адмін-діях: токен неможливо підібрати (192 біти ентропії),
# але без цього другого шару можна нескінченно бомбардувати ендпоінт
# запитами до бази, кожен з яких усе одно доходить до SELECT/порівняння.
SELF_SERVICE_RATE_WINDOW_SECONDS = 60
SELF_SERVICE_RATE_MAX_REQUESTS = 10


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


@router.post("", response_model=ReviewCreatedOut, status_code=201)
async def create_review(venue_id: int, review: ReviewIn, request: Request):
    # Honeypot: якщо приховане поле заповнене — це бот, тихо відхиляємо.
    if review.website:
        raise HTTPException(status_code=400, detail="Помилка валідації")

    client_ip = get_client_ip(request)
    ip_hash = hash_ip(client_ip)
    edit_token = secrets.token_urlsafe(24)  # приватний, тільки цей браузер його побачить

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
                detail="Схоже, з цієї мережі вже залишали відгук для цього закладу нещодавно. Якщо це не ти — спробуй з іншого Wi-Fi чи мобільного інтернету.",
            )

        row = await conn.fetchrow(
            """
            INSERT INTO reviews (venue_id, author_name, rating, comment, ip_hash, edit_token)
            VALUES ($1,$2,$3,$4,$5,$6)
            RETURNING id, venue_id, author_name, rating, comment, created_at, edit_token
            """,
            venue_id, review.author_name, review.rating, review.comment, ip_hash, edit_token,
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


async def _get_review_by_token(conn, request: Request, venue_id: int, review_id: int, edit_token: str | None):
    """Спільна перевірка для обох self-service ендпоінтів нижче —
    hmac.compare_digest, той самий захист від timing-атак, що й на
    адмін-ключі, плюс rate-limit як другий незалежний шар."""
    ip_hash = hashlib.sha256(f"{IP_SALT}{get_client_ip(request)}".encode()).hexdigest()
    await check_rate_limit_db(
        conn, f"review-self:{ip_hash}", SELF_SERVICE_RATE_WINDOW_SECONDS, SELF_SERVICE_RATE_MAX_REQUESTS
    )

    if not edit_token:
        raise HTTPException(status_code=403, detail="Немає токена для редагування")

    row = await conn.fetchrow(
        "SELECT edit_token FROM reviews WHERE id=$1 AND venue_id=$2", review_id, venue_id
    )
    if not row or not row["edit_token"]:
        raise HTTPException(status_code=404, detail="Відгук не знайдено")
    if not hmac.compare_digest(edit_token, row["edit_token"]):
        raise HTTPException(status_code=403, detail="Невірний токен — це не твій відгук")


@router.put("/{review_id}/mine", response_model=ReviewOut)
async def update_my_review(
    venue_id: int,
    review_id: int,
    update: ReviewUpdateIn,
    request: Request,
    x_edit_token: str | None = Header(default=None),
):
    """Самостійне редагування — тільки той, хто має правильний токен
    (виданий саме цьому браузеру при створенні відгуку). Ім'я змінити
    не можна навмисно — щоб не можна було "перевидати" відгук під іншим
    автором."""
    conn = await get_connection()
    try:
        await _get_review_by_token(conn, request, venue_id, review_id, x_edit_token)

        row = await conn.fetchrow(
            """
            UPDATE reviews SET rating=$1, comment=$2 WHERE id=$3 AND venue_id=$4
            RETURNING id, venue_id, author_name, rating, comment, created_at
            """,
            update.rating, update.comment, review_id, venue_id,
        )

        await conn.execute(
            """
            UPDATE venues SET
                avg_rating = (SELECT ROUND(AVG(rating)::numeric, 1) FROM reviews WHERE venue_id=$1)
            WHERE id=$1
            """,
            venue_id,
        )
        return dict(row)
    finally:
        await conn.close()


@router.delete("/{review_id}/mine", status_code=204)
async def delete_my_review(
    venue_id: int,
    review_id: int,
    request: Request,
    x_edit_token: str | None = Header(default=None),
):
    """Самостійне видалення власного відгуку — той самий принцип
    токена, окремий шлях від адмінського DELETE нижче (щоб не
    змішувати два різні механізми довіри на одному маршруті)."""
    conn = await get_connection()
    try:
        await _get_review_by_token(conn, request, venue_id, review_id, x_edit_token)

        await conn.execute("DELETE FROM reviews WHERE id=$1 AND venue_id=$2", review_id, venue_id)

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


@router.delete("/{review_id}", status_code=204)
async def delete_review(
    venue_id: int,
    review_id: int,
    request: Request,
    x_admin_key: str | None = Header(default=None),
):
    """Видалення відгуку — тільки для тебе, той самий адмін-ключ і
    rate-limit, що й на закладах."""
    await check_admin(x_admin_key, request)

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
