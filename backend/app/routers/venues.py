import hashlib
import hmac
import os
import time
from fastapi import APIRouter, HTTPException, Header, Request
from app.database import get_connection
from app.models import VenueIn, VenueOut

router = APIRouter(prefix="/venues", tags=["venues"])

ADMIN_API_KEY = os.environ["ADMIN_API_KEY"]
CLOUDINARY_API_KEY = os.environ.get("CLOUDINARY_API_KEY")
CLOUDINARY_API_SECRET = os.environ.get("CLOUDINARY_API_SECRET")
CLOUDINARY_CLOUD_NAME = os.environ.get("CLOUDINARY_CLOUD_NAME")
IP_SALT = os.environ["IP_HASH_SALT"]

# Rate-limit на "чутливі" адмін-дії (вхід, зміна/видалення закладів) —
# другий незалежний шар захисту, окремий від сили самого ключа. Навіть при
# криптографічно випадковому ключі це захищає від навантаження на
# інфраструктуру (Neon-з'єднання, час виконання функції) самим лише
# потоком запитів, і від сценарію витоку ключа деінде (коміт, лог,
# скріншот) — другий шар не рятує перший, але й не залежить від нього.
_ADMIN_RATE_LIMIT = {}
_ADMIN_RATE_LIMIT_WINDOW_SECONDS = 60
_ADMIN_RATE_LIMIT_MAX_REQUESTS = 5

# Окремий, щедріший ліміт саме для підпису завантаження фото — інша вага
# дії: не змінює жодних даних, не потребує підключення до БД, і легітимний
# сценарій (додати заклад одразу з 10+ фото з галереї) реально потребує
# кількох підписів поспіль за секунди. Спільний лічильник з чутливими
# діями раніше ламав bulk-завантаження вже на 6-му файлі.
_UPLOAD_RATE_LIMIT = {}
_UPLOAD_RATE_LIMIT_WINDOW_SECONDS = 60
_UPLOAD_RATE_LIMIT_MAX_REQUESTS = 30


def _get_client_ip(request: Request) -> str:
    forwarded = request.headers.get("x-forwarded-for")
    if forwarded:
        return forwarded.split(",")[0].strip()
    return request.client.host if request.client else "unknown"


def _rate_limit(request: Request, store: dict, window: int, max_requests: int):
    ip_hash = hashlib.sha256(f"{IP_SALT}{_get_client_ip(request)}".encode()).hexdigest()
    now = time.time()
    timestamps = [t for t in store.get(ip_hash, []) if now - t < window]
    if len(timestamps) >= max_requests:
        raise HTTPException(status_code=429, detail="Забагато спроб — зачекай хвилину.")
    timestamps.append(now)
    store[ip_hash] = timestamps


def check_admin(x_admin_key: str | None, request: Request):
    """Перевірка ключа для чутливих ендпоінтів (вхід, зміна/видалення
    закладів). hmac.compare_digest замість != — захищає від timing-атак."""
    _rate_limit(request, _ADMIN_RATE_LIMIT, _ADMIN_RATE_LIMIT_WINDOW_SECONDS, _ADMIN_RATE_LIMIT_MAX_REQUESTS)
    if not x_admin_key or not hmac.compare_digest(x_admin_key, ADMIN_API_KEY):
        raise HTTPException(status_code=403, detail="Невірний адмін-ключ")


def check_admin_for_upload(x_admin_key: str | None, request: Request):
    """Той самий ключ, той самий hmac.compare_digest — але окремий,
    щедріший rate-limit, розрахований саме на bulk-завантаження фото."""
    _rate_limit(request, _UPLOAD_RATE_LIMIT, _UPLOAD_RATE_LIMIT_WINDOW_SECONDS, _UPLOAD_RATE_LIMIT_MAX_REQUESTS)
    if not x_admin_key or not hmac.compare_digest(x_admin_key, ADMIN_API_KEY):
        raise HTTPException(status_code=403, detail="Невірний адмін-ключ")


@router.post("/upload-signature")
async def get_upload_signature(request: Request, x_admin_key: str | None = Header(default=None)):
    """Генерує короткоживучий підпис для завантаження фото напряму з браузера
    в Cloudinary — заміна публічного unsigned preset. API_SECRET лишається
    тільки тут, на сервері, і ніколи не потрапляє у фронтенд-бандл."""
    check_admin_for_upload(x_admin_key, request)
    if not CLOUDINARY_API_KEY or not CLOUDINARY_API_SECRET or not CLOUDINARY_CLOUD_NAME:
        raise HTTPException(status_code=500, detail="Cloudinary не налаштовано на бекенді")

    timestamp = int(time.time())
    folder = "ternopil-venues"

    # Cloudinary вимагає підпис саме за такою схемою: параметри (без file/
    # api_key/signature/cloud_name), відсортовані за ключем, склеєні в
    # "key=value&key=value", і в кінці дописаний api_secret — усе разом
    # хешується SHA-1.
    params_to_sign = {"folder": folder, "timestamp": timestamp}
    sorted_params = "&".join(f"{k}={v}" for k, v in sorted(params_to_sign.items()))
    signature = hashlib.sha1((sorted_params + CLOUDINARY_API_SECRET).encode("utf-8")).hexdigest()

    return {
        "timestamp": timestamp,
        "signature": signature,
        "api_key": CLOUDINARY_API_KEY,
        "cloud_name": CLOUDINARY_CLOUD_NAME,
        "folder": folder,
    }


@router.get("", response_model=list[VenueOut])
async def list_venues(category: str | None = None, district: str | None = None):
    """Публічний список закладів, з опційними фільтрами по категорії й району."""
    conn = await get_connection()
    try:
        if category and district:
            rows = await conn.fetch(
                "SELECT * FROM venues WHERE category = $1 AND district = $2 ORDER BY name",
                category, district,
            )
        elif category:
            rows = await conn.fetch(
                "SELECT * FROM venues WHERE category = $1 ORDER BY name", category
            )
        elif district:
            rows = await conn.fetch(
                "SELECT * FROM venues WHERE district = $1 ORDER BY name", district
            )
        else:
            rows = await conn.fetch("SELECT * FROM venues ORDER BY name")
        return [dict(row) for row in rows]
    finally:
        await conn.close()


@router.get("/{venue_id}", response_model=VenueOut)
async def get_venue(venue_id: int):
    conn = await get_connection()
    try:
        row = await conn.fetchrow("SELECT * FROM venues WHERE id = $1", venue_id)
        if not row:
            raise HTTPException(status_code=404, detail="Заклад не знайдено")
        return dict(row)
    finally:
        await conn.close()


@router.post("", response_model=VenueOut, status_code=201)
async def create_venue(venue: VenueIn, request: Request, x_admin_key: str | None = Header(default=None)):
    """Додавання закладу — тільки для тебе (адмінка), потребує заголовок X-Admin-Key."""
    check_admin(x_admin_key, request)
    conn = await get_connection()
    try:
        row = await conn.fetchrow(
            """
            INSERT INTO venues
                (name, category, district, tags, description, address, lat, lng,
                 price_level, social_link, image_urls)
            VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)
            RETURNING *
            """,
            venue.name, venue.category, venue.district, venue.tags,
            venue.description, venue.address,
            venue.lat, venue.lng, venue.price_level, venue.social_link,
            venue.image_urls,
        )
        return dict(row)
    finally:
        await conn.close()


@router.put("/{venue_id}", response_model=VenueOut)
async def update_venue(venue_id: int, venue: VenueIn, request: Request, x_admin_key: str | None = Header(default=None)):
    check_admin(x_admin_key, request)
    conn = await get_connection()
    try:
        row = await conn.fetchrow(
            """
            UPDATE venues SET
                name=$1, category=$2, district=$3, tags=$4, description=$5, address=$6,
                lat=$7, lng=$8, price_level=$9, social_link=$10, image_urls=$11
            WHERE id=$12
            RETURNING *
            """,
            venue.name, venue.category, venue.district, venue.tags,
            venue.description, venue.address,
            venue.lat, venue.lng, venue.price_level, venue.social_link,
            venue.image_urls, venue_id,
        )
        if not row:
            raise HTTPException(status_code=404, detail="Заклад не знайдено")
        return dict(row)
    finally:
        await conn.close()


@router.delete("/{venue_id}", status_code=204)
async def delete_venue(venue_id: int, request: Request, x_admin_key: str | None = Header(default=None)):
    check_admin(x_admin_key, request)
    conn = await get_connection()
    try:
        result = await conn.execute("DELETE FROM venues WHERE id=$1", venue_id)
        if result == "DELETE 0":
            raise HTTPException(status_code=404, detail="Заклад не знайдено")
    finally:
        await conn.close()
