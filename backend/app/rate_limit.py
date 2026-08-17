from fastapi import HTTPException


async def check_rate_limit_db(conn, key: str, window_seconds: int, max_requests: int):
    """Rate-limit через Neon Postgres замість пам'яті процесу.

    На Vercel serverless-функція постійно "холодно стартує" на різних
    контейнерах — in-memory dict щоразу обнуляється, тож попередній підхід
    рятував лише поки той самий контейнер лишався "теплим" (ненадійно саме
    в моменти найбільшого навантаження, коли контейнерів багато). База
    даних спільна для всіх контейнерів, тож лічильник тут завжди один
    правильний, незалежно від того, який саме контейнер обробляє запит.

    Один атомарний UPSERT: або створює новий запис на цей ключ, або (якщо
    вікно часу ще не вийшло) інкрементує лічильник, або (якщо вікно вже
    вийшло) скидає його на 1 — усе в одному запиті, без риску гонки умов
    між "прочитати" і "записати".
    """
    row = await conn.fetchrow(
        """
        INSERT INTO rate_limits (key, count, window_start)
        VALUES ($1, 1, now())
        ON CONFLICT (key) DO UPDATE SET
            count = CASE
                WHEN rate_limits.window_start < now() - make_interval(secs => $2) THEN 1
                ELSE rate_limits.count + 1
            END,
            window_start = CASE
                WHEN rate_limits.window_start < now() - make_interval(secs => $2) THEN now()
                ELSE rate_limits.window_start
            END
        RETURNING count
        """,
        key,
        window_seconds,
    )
    if row["count"] > max_requests:
        raise HTTPException(status_code=429, detail="Забагато запитів — зачекай і спробуй ще раз.")
