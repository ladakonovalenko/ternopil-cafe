# Ternopil Cafe — заклади Тернополя

Монорепозиторій з двома незалежними проєктами:

- **`backend/`** — FastAPI + Neon Postgres + Gemini, деплоїться на Vercel окремо
- **`frontend/`** — React + Vite + Tailwind + Leaflet, деплоїться на Vercel окремо

Кожна папка має власний README з деталями і кроками деплою.

## Деплой з монорепо на Vercel

Створюєш на Vercel **два окремі проєкти** з цього ж репозиторію:
1. Перший проєкт → у налаштуваннях імпорту вкажи **Root Directory: `backend`**
2. Другий проєкт → **Root Directory: `frontend`**

Vercel сам розпізнає стек по вмісту вибраної папки.
