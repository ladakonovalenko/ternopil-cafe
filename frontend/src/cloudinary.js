// Вставляє трансформацію Cloudinary просто в URL (це стандартний спосіб
// Cloudinary — параметри йдуть прямо в адресу зображення, без окремих
// запитів). Для будь-якого іншого джерела фото (напр. старі посилання з
// Google, якщо десь лишились) повертає адресу без змін — щоб нічого не
// зламати для них.
function cloudinaryUrl(url, transform) {
  if (!url || !url.includes("res.cloudinary.com") || !url.includes("/upload/")) {
    return url;
  }
  return url.replace("/upload/", `/upload/${transform}/`);
}

// q_auto,f_auto — Cloudinary сам підбирає оптимальну якість і формат
// (напр. WebP/AVIF для браузерів, що їх підтримують) замість того, щоб
// завжди віддавати оригінальний файл повного розміру.
export const cloudinarySizes = {
  // Маленька картка в сітці/стрічці (aspect-[4/3], ширина коло 300-400px)
  card: (url) => cloudinaryUrl(url, "w_500,h_375,c_fill,g_auto,q_auto,f_auto"),
  // Заголовне фото в картці закладу (aspect-[16/9], ширина до ~700px)
  detail: (url) => cloudinaryUrl(url, "w_1000,h_563,c_fill,g_auto,q_auto,f_auto"),
  // Повноекранний перегляд — без обрізання, тільки обмеження максимальної
  // ширини (c_limit не збільшує менші фото, тільки не дає завеликим бути
  // важчими, ніж треба для екрану)
  full: (url) => cloudinaryUrl(url, "w_1600,c_limit,q_auto,f_auto"),
  // Дрібні мініатюри в горизонтальних стрічках ("Нещодавно переглянуті" тощо)
  strip: (url) => cloudinaryUrl(url, "w_200,h_150,c_fill,g_auto,q_auto,f_auto"),
};
