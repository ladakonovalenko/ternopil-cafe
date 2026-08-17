import hashlib
import hmac
import os
import time
from fastapi import APIRouter, HTTPException, Header
from app.database import get_connection
from app.models import VenueIn, VenueOut

router = APIRouter(prefix="/venues", tags=["venues"])

ADMIN_API_KEY = os.environ["ADMIN_API_KEY"]
CLOUDINARY_API_KEY = os.environ.get("CLOUDINARY_API_KEY")
CLOUDINARY_API_SECRET = os.environ.get("CLOUDINARY_API_SECRET")
CLOUDINARY_CLOUD_NAME = os.environ.get("CLOUDINARY_CLOUD_NAME")


def check_admin(x_admin_key: str | None):
    """Перевірка ключа для ендпоінтів, доступних тільки тобі.
    hmac.compare_digest замість != — захищає від timing-атак
    (за час відповіді неможливо здогадатись, скільки символів ключа вгадано)."""
    if not x_admin_key or not hmac.compare_digest(x_admin_key, ADMIN_API_KEY):
        raise HTTPException(status_code=403, detail="Невірний адмін-ключ")


@router.post("/upload-signature")
async def get_upload_signature(x_admin_key: str | None = Header(default=None)):
    """Генерує короткоживучий підпис для завантаження фото напряму з браузера
    в Cloudinary — заміна публічного unsigned preset. API_SECRET лишається
    тільки тут, на сервері, і ніколи не потрапляє у фронтенд-бандл."""
    check_admin(x_admin_key)
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
async def create_venue(venue: VenueIn, x_admin_key: str | None = Header(default=None)):
    """Додавання закладу — тільки для тебе (адмінка), потребує заголовок X-Admin-Key."""
    check_admin(x_admin_key)
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
async def update_venue(venue_id: int, venue: VenueIn, x_admin_key: str | None = Header(default=None)):
    check_admin(x_admin_key)
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
async def delete_venue(venue_id: int, x_admin_key: str | None = Header(default=None)):
    check_admin(x_admin_key)
    conn = await get_connection()
    try:
        result = await conn.execute("DELETE FROM venues WHERE id=$1", venue_id)
        if result == "DELETE 0":
            raise HTTPException(status_code=404, detail="Заклад не знайдено")
    finally:
        await conn.close()