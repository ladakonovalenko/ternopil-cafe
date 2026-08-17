-- Міграція для ІСНУЮЧОЇ бази (виконати ОДИН РАЗ у Neon SQL Editor).
-- Проста таблиця обліку відвідувань — тільки хеш IP (не сирий IP) і шлях,
-- жодних персональних даних чи cookies.

CREATE TABLE IF NOT EXISTS page_views (
    id SERIAL PRIMARY KEY,
    path VARCHAR(300),
    ip_hash VARCHAR(64) NOT NULL,
    created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_page_views_created_at ON page_views(created_at);
