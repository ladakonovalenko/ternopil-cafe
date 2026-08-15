import json
import os
import time
from fastapi import APIRouter, HTTPException
from google import genai
from app.database import get_connection
from app.models import SearchRequest, SearchResponse, SearchResultItem

router = APIRouter(prefix="/search", tags=["search"])

GEMINI_API_KEY = os.environ["GEMINI_API_KEY"]
client = genai.Client(api_key=GEMINI_API_KEY)

# Простий кеш в пам'яті процесу — рятує тільки поки serverless-функція
# "тепла" (той самий контейнер), Vercel на безкоштовному тарифі часто
# створює новий контейнер на кожен виклик, тож не розраховуй на це як
# на надійний кеш — це просто приємний бонус, коли спрацьовує.
_CACHE = {}
_CACHE_TTL_SECONDS = 5 * 60

SYSTEM_PROMPT = """\
Ти — рекомендаційний асистент для сайту закладів Тернополя.
Тобі дано список закладів у форматі JSON та запит користувача українською мовою.
Кожен заклад має: category (тип закладу), district (район міста), tags (ключові
слова про спеціалізацію — наприклад "повноцінні страви", "кава", "десерти",
"коктейлі"), price_level, description, address.

ПРАВИЛА ПРІОРИТЕТУ:

1. РАЙОН — якщо запит згадує конкретний район, локацію чи орієнтир (наприклад
   "в центрі", "на Дружбі", "поруч з парком", "на Об'їзній") — включай ТІЛЬКИ
   заклади з відповідним district. Не пропонуй заклади з іншого району, навіть
   якщо вони чудово підходять за типом. Якщо запит не згадує район — це не
   критерій, ігноруй його.

2. ТИП ПОТРЕБИ — визнач, що людина насправді хоче (повноцінно поїсти, випити
   кави, випити алкоголь, перекусити тощо) і зістав це з category та tags
   кожного закладу:
   - ПЕРШИЙ ПРІОРИТЕТ: заклади, де це основна спеціалізація (є відповідний tag
     або category прямо відповідає — напр. запит "поїсти" → category "ресторан"
     чи tag "повноцінні страви")
   - ДРУГИЙ ПРІОРИТЕТ (тільки якщо закладів першого пріоритету менше 3): заклади,
     де це доступно, але не є головною спеціалізацією (напр. кав'ярня, де є й
     легкі перекуси, для запиту "поїсти"). У reason чесно познач це як
     другорядний варіант, наприклад: "(тут не основна кухня, але є бутерброди)"
   - Якщо запит не уточнює тип (просто "куди піти"), тип не критерій.

3. Враховуй також ціновий рівень, опис і будь-що інше згадане в запиті.

Обери 3-5 закладів, спочатку найкращі відповідники. Поверни ВИКЛЮЧНО JSON-масив
(без пояснень поза ним, без markdown-огорожі) у форматі:
[{"venue_id": 3, "name": "Назва", "reason": "коротке пояснення чому підходить (1 речення)"}]

Якщо після фільтру по району не лишилось жодного відповідника — чесно поверни
порожній масив [], не підміняй район.
"""


@router.post("", response_model=SearchResponse)
async def search_venues(search: SearchRequest):
    cache_key = search.query.strip().lower()
    cached = _CACHE.get(cache_key)
    if cached and (time.time() - cached["ts"]) < _CACHE_TTL_SECONDS:
        return SearchResponse(results=cached["results"])

    conn = await get_connection()
    try:
        rows = await conn.fetch(
            "SELECT id, name, category, district, tags, description, address, price_level "
            "FROM venues ORDER BY id"
        )
    finally:
        await conn.close()

    if not rows:
        raise HTTPException(status_code=404, detail="У базі ще немає закладів")

    venues_json = json.dumps(
        [dict(row) for row in rows], ensure_ascii=False, default=str
    )

    prompt = (
        f"{SYSTEM_PROMPT}\n\n"
        f"Список закладів:\n{venues_json}\n\n"
        f"Запит користувача: {search.query}"
    )

    try:
        response = client.models.generate_content(
            model="gemini-3.6-flash",
            contents=prompt,
        )
    except Exception as e:
        raise HTTPException(
            status_code=503,
            detail=f"Тимчасово недоступно (можливо, вичерпано ліміт запитів Gemini): {e}",
        )

    raw_text = response.text.strip()
    # Gemini інколи все ж огортає відповідь в ```json ... ``` — знімаємо це.
    if raw_text.startswith("```"):
        raw_text = raw_text.strip("`")
        raw_text = raw_text.removeprefix("json").strip()

    try:
        parsed = json.loads(raw_text)
    except json.JSONDecodeError:
        raise HTTPException(
            status_code=502,
            detail="Не вдалося розібрати відповідь LLM. Спробуй ще раз.",
        )

    results = [SearchResultItem(**item) for item in parsed]
    _CACHE[cache_key] = {"results": results, "ts": time.time()}
    return SearchResponse(results=results)


SIMILAR_PROMPT = """\
Ти рекомендуєш схожі заклади для сайту закладів Тернополя.
Тобі дано один "поточний" заклад і список усіх інших закладів у форматі JSON.

Обери 3 заклади зі списку, найбільш схожі на поточний за категорією,
ключовими словами (tags) і загальним духом (за описом) — район необов'язково
той самий, головне схожість за типом і атмосферою.

Поверни ВИКЛЮЧНО JSON-масив (без пояснень поза ним, без markdown-огорожі):
[{"venue_id": 3, "name": "Назва", "reason": "коротке пояснення схожості (1 речення)"}]
"""


@router.get("/{venue_id}/similar", response_model=SearchResponse)
async def similar_venues(venue_id: int):
    conn = await get_connection()
    try:
        current = await conn.fetchrow(
            "SELECT id, name, category, tags, description FROM venues WHERE id = $1",
            venue_id,
        )
        if not current:
            raise HTTPException(status_code=404, detail="Заклад не знайдено")

        others = await conn.fetch(
            "SELECT id, name, category, tags, description FROM venues WHERE id != $1 ORDER BY id",
            venue_id,
        )
    finally:
        await conn.close()

    if not others:
        return SearchResponse(results=[])

    cache_key = f"similar:{venue_id}"
    cached = _CACHE.get(cache_key)
    if cached and (time.time() - cached["ts"]) < _CACHE_TTL_SECONDS:
        return SearchResponse(results=cached["results"])

    current_json = json.dumps(dict(current), ensure_ascii=False, default=str)
    others_json = json.dumps([dict(row) for row in others], ensure_ascii=False, default=str)

    prompt = (
        f"{SIMILAR_PROMPT}\n\n"
        f"Поточний заклад:\n{current_json}\n\n"
        f"Список інших закладів:\n{others_json}"
    )

    try:
        response = client.models.generate_content(model="gemini-3.6-flash", contents=prompt)
    except Exception as e:
        raise HTTPException(
            status_code=503,
            detail=f"Тимчасово недоступно (можливо, вичерпано ліміт запитів Gemini): {e}",
        )

    raw_text = response.text.strip()
    if raw_text.startswith("```"):
        raw_text = raw_text.strip("`")
        raw_text = raw_text.removeprefix("json").strip()

    try:
        parsed = json.loads(raw_text)
    except json.JSONDecodeError:
        raise HTTPException(status_code=502, detail="Не вдалося розібрати відповідь LLM.")

    results = [SearchResultItem(**item) for item in parsed]
    _CACHE[cache_key] = {"results": results, "ts": time.time()}
    return SearchResponse(results=results)
