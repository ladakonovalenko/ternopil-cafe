// Ця функція викликається ТІЛЬКИ для запитів на "/" з параметром ?venue=
// (див. правило "has" у vercel.json) — звичайні відвідувачі сайту сюди
// взагалі не потрапляють, вони й далі отримують статичний index.html
// напряму, без жодної затримки.
//
// Мета: коли хтось ділиться посиланням ternopilcafes.com/?venue=123 у
// Telegram/Viber, бот-краулер цих месенджерів читає <meta>-теги з HTML
// одразу, не виконуючи JavaScript — тож звичайний React-сайт для нього
// завжди показував би однакове загальне прев'ю. Ця функція підставляє
// назву/фото/опис КОНКРЕТНОГО закладу прямо в HTML, перш ніж він піде
// далі. Для живої людини, яка перейде за цим посиланням, усе працює
// так само, як завжди — просто мета-теги в <head> вже правильні.

export default async function handler(req, res) {
  const host = req.headers.host;
  const backendUrl = (process.env.VITE_API_BASE_URL || "").replace(/\/+$/, "");
  const venueId = new URL(req.url, `https://${host}`).searchParams.get("venue");

  // Завжди тягнемо РЕАЛЬНИЙ статичний index.html з того ж домену —
  // без параметра venue це правило "has" у vercel.json не спрацює,
  // і Vercel віддасть звичайний білд-файл, без рекурсії в цю ж функцію.
  const baseHtmlRes = await fetch(`https://${host}/`);
  let html = await baseHtmlRes.text();

  if (!venueId || !backendUrl) {
    res.setHeader("Content-Type", "text/html; charset=utf-8");
    return res.status(200).send(html);
  }

  try {
    const venueRes = await fetch(`${backendUrl}/venues/${venueId}`);
    if (!venueRes.ok) throw new Error("venue not found");
    const venue = await venueRes.json();

    const title = `${venue.name} — Тернопіль | Куди підеш`;
    const description = (venue.description || "").slice(0, 160);
    const image = venue.image_urls?.[0] || `https://${host}/og-image.png`;
    const url = `https://${host}/?venue=${venueId}`;

    html = html
      .replace(/<title>.*?<\/title>/, `<title>${escapeHtml(title)}</title>`)
      .replace(
        /(<meta property="og:title" content=")[^"]*(")/,
        `$1${escapeHtml(title)}$2`
      )
      .replace(
        /(<meta property="og:description" content=")[^"]*(")/,
        `$1${escapeHtml(description)}$2`
      )
      .replace(
        /(<meta property="og:image" content=")[^"]*(")/,
        `$1${escapeHtml(image)}$2`
      )
      .replace(/(<meta property="og:url" content=")[^"]*(")/, `$1${escapeHtml(url)}$2`)
      .replace(
        /(<meta name="description" content=")[^"]*(")/,
        `$1${escapeHtml(description)}$2`
      );
  } catch {
    // Заклад не знайдено чи бекенд недоступний — тихо повертаємо
    // звичайний загальний HTML, а не ламаємо сторінку для відвідувача.
  }

  res.setHeader("Content-Type", "text/html; charset=utf-8");
  return res.status(200).send(html);
}

function escapeHtml(str) {
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
