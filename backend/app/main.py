from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.routers import venues, reviews, search

app = FastAPI(title="Заклади Тернополя API")

# На проді звузь origins до реальної адреси свого фронтенду на Vercel
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(venues.router)
app.include_router(reviews.router)
app.include_router(search.router)


@app.get("/health")
async def health():
    return {"status": "ok"}
