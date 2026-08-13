# Заклади Тернополя — бекенд

FastAPI, деплой на Vercel як serverless-функція, БД — Neon Postgres.
Код протестований локально (роутинг, підключення, серіалізація) — синтаксично
й логічно робочий. Реальний деплой і БД потребують твоїх облікових записів.

## Що вже готово
- `schema.sql` — схема БД (venues, reviews)
- `app/` — FastAPI-застосунок: венью (CRUD, адмінка через `X-Admin-Key`),
  відгуки (анонімні, з honeypot і rate-limit по IP-хешу), пошук через Gemini
- `api/index.py` — вхідна точка для Vercel

## Кроки для запуску

1. **Neon**: створи проект на neon.tech (безкоштовно), відкрий SQL Editor,
   встав і виконай вміст `schema.sql`. Скопіюй "Pooled connection" рядок.

2. **Gemini**: отримай ключ на aistudio.google.com/apikey (безкоштовно).

3. **Локальний тест** (опційно, перед деплоєм):
   ```
   cd backend
   pip install -r requirements.txt
   cp .env.example .env   # встав туди свої реальні значення
   export $(cat .env | xargs)
   uvicorn app.main:app --reload
   ```
   Відкрий http://localhost:8000/docs — там інтерактивна документація
   і можна одразу потестувати ендпоінти.

4. **Vercel**:
   - `vercel` (з кореня `backend/`) або підключи репозиторій через дашборд
   - У Project Settings → Environment Variables додай: `DATABASE_URL`,
     `ADMIN_API_KEY`, `GEMINI_API_KEY`, `IP_HASH_SALT`
   - Задеплой

5. **Перевірка**: `https://твій-проект.vercel.app/health` має повернути `{"status":"ok"}`

## Ендпоінти

| Метод | Шлях | Доступ |
|---|---|---|
| GET | `/venues` | публічний |
| GET | `/venues/{id}` | публічний |
| POST | `/venues` | адмін (`X-Admin-Key`) |
| PUT | `/venues/{id}` | адмін |
| DELETE | `/venues/{id}` | адмін |
| GET | `/venues/{id}/reviews` | публічний |
| POST | `/venues/{id}/reviews` | публічний, анонімний |
| POST | `/search` | публічний — `{"query": "..."}` |

## Наступний крок
Коли бекенд задеплоєний і БД наповнена кількома закладами вручну
(через `POST /venues` з адмін-ключем, можна прямо з `/docs`) — переходимо
до фронтенду.
