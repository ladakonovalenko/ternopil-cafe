import os
import asyncpg

# Бери "pooled" connection string з Neon dashboard (там де написано
# "Pooled connection") — вона краще підходить для serverless,
# бо Vercel створює нову функцію на кожен запит.
DATABASE_URL = os.environ["DATABASE_URL"]


async def get_connection() -> asyncpg.Connection:
    """
    Відкриває нове з'єднання на один запит.
    У serverless-середовищі (Vercel) не варто тримати довгоживучий пул —
    кожен виклик функції може бути новим інстансом.
    Використання:
        conn = await get_connection()
        try:
            ...
        finally:
            await conn.close()
    """
    return await asyncpg.connect(DATABASE_URL, statement_cache_size=0)
