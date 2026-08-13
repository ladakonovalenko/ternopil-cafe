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

Твоє завдання: обрати 3-5 закладів зі списку, які найкраще відповідають запиту
(враховуй локацію, тип закладу, ціновий рівень, опис — усе, що згадано в запиті).

Поверни ВИКЛЮЧНО JSON-масив (без пояснень поза ним, без markdown-огорожі) у форматі:
[{"venue_id": 3, "name": "Назва", "reason": "коротке пояснення чому підходить (1 речення)"}]

Якщо жоден заклад явно не підходить — все одно поверни 1-3 найближчі за змістом варіанти.
"""


@router.post("", response_model=SearchResponse)
async def search_venues(search: SearchRequest):
    conn = await get_connection()
    try:
        rows = await conn.fetch(
            "SELECT id, name, category, description, address, price_level "
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
        model="gemini-2.5-flash",
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
