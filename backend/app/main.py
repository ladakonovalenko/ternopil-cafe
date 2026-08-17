from fastapi import FastAPI, Header, Request
from fastapi.middleware.cors import CORSMiddleware
from app.routers import venues, reviews, search
from app.routers.venues import check_admin

app = FastAPI(title="Заклади Тернополя API")

# Звужено до реального фронтенду замість "*" — див. security review.
# Якщо колись підключиш власний домен, додай його в цей список теж.
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "https://ternopil-cafe-frontend.vercel.app",
        "https://ternopilcafes.com",
        "https://www.ternopilcafes.com",
    ],
    allow_methods=["GET", "POST", "PUT", "DELETE"],
    allow_headers=["Content-Type", "X-Admin-Key"],
)

app.include_router(venues.router)
app.include_router(reviews.router)
app.include_router(search.router)


@app.get("/health")
async def health():
    return {"status": "ok"}


@app.get("/admin/verify")
async def verify_admin(request: Request, x_admin_key: str | None = Header(default=None)):
    """Реальна перевірка ключа на сервері — та сама безпечна функція,
    що вже захищає POST/PUT/DELETE. Викликається формою входу в адмінку
    ДО того, як показати дашборд, а не замість перевірки на кожній дії."""
    check_admin(x_admin_key, request)
    return {"valid": True}