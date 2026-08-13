-- Схема БД для проекту "Заклади Тернополя"
-- Виконати один раз у Neon SQL Editor (або через psql)

CREATE TABLE IF NOT EXISTS venues (
    id SERIAL PRIMARY KEY,
    name VARCHAR(200) NOT NULL,
    category VARCHAR(100) NOT NULL,          -- напр. "кав'ярня", "ресторан", "бар"
    description TEXT NOT NULL,
    address VARCHAR(300) NOT NULL,
    lat DOUBLE PRECISION,
    lng DOUBLE PRECISION,
    price_level VARCHAR(10),                 -- "$" / "$$" / "$$$"
    social_link VARCHAR(300),                -- посилання на Instagram/Facebook тощо
    image_urls TEXT[] DEFAULT '{}',          -- масив URL зображень (з Cloudinary)
    avg_rating NUMERIC(2,1) DEFAULT 0,
    reviews_count INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS reviews (
    id SERIAL PRIMARY KEY,
    venue_id INTEGER NOT NULL REFERENCES venues(id) ON DELETE CASCADE,
    author_name VARCHAR(100) NOT NULL,
    rating SMALLINT NOT NULL CHECK (rating BETWEEN 1 AND 5),
    comment TEXT,
    ip_hash VARCHAR(64),                     -- хеш IP для анти-спам rate-limit, не сирий IP
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Індекс для швидкого пошуку відгуків по закладу
CREATE INDEX IF NOT EXISTS idx_reviews_venue_id ON reviews(venue_id);
CREATE INDEX IF NOT EXISTS idx_venues_category ON venues(category);
