import json
import os
from fastapi import APIRouter, HTTPException
from google import genai
from app.database import get_connection
from app.models import SearchRequest, SearchResponse, SearchResultItem

router = APIRouter(prefix="/search", tags=["search"])

GEMINI_API_KEY = os.environ["GEMINI_API_KEY"]
client = genai.Client(api_key=GEMINI_API_KEY)

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

    response = client.models.generate_content(
        model="gemini-3.6-flash",
        contents=prompt,
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
    return SearchResponse(results=results)
