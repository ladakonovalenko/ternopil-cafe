-- Міграція для ІСНУЮЧОЇ бази (виконати ОДИН РАЗ у Neon SQL Editor).
-- Замінює ненадійний in-memory rate-limit (obнулявся на кожен новий
-- serverless-контейнер) на спільний, надійний лічильник у базі.

CREATE TABLE IF NOT EXISTS rate_limits (
    key VARCHAR(128) PRIMARY KEY,
    count INTEGER NOT NULL DEFAULT 1,
    window_start TIMESTAMPTZ NOT NULL DEFAULT now()
);
