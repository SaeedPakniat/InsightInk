# InsightInk Developer Bible — LaTeX Source

این پوشه منبع اصلی مستندات توسعه InsightInk است.

## خروجی نهایی

`InsightInk_Developer_Bible.pdf`

سند با XeLaTeX و XePersian ساخته می‌شود و شامل معماری، نیازمندی‌ها، مسیر یادگیری، مدل داده، API، Frontend، Recommendation، Realtime، TTS/PWA، امنیت، تست، Roadmap، Playbookهای پیاده‌سازی و Traceability کامل منابع است.

## ساخت PDF

از همین پوشه اجرا کن:

```bash
make pdf
```

یا مستقیم:

```bash
mkdir -p build
latexmk -xelatex -interaction=nonstopmode -halt-on-error -outdir=build main.tex
cp build/main.pdf InsightInk_Developer_Bible.pdf
```

## پاک کردن فایل‌های موقت

```bash
make clean
```

فایل‌های اصلی:

- `main.tex` — سند اصلی و ترتیب فصل‌ها
- `preamble.tex` — فونت، رنگ، layout، code listings و boxها
- `chapters/` — فصل‌های مستقل
- `InsightInk_Developer_Bible.pdf` — خروجی کامپایل‌شده

## فونت و ابزار مورد نیاز

روی سیستم فعلی این موارد تأیید شده‌اند:

- XeLaTeX
- latexmk
- xepersian
- Vazirmatn
- DejaVu Sans / DejaVu Sans Mono

فایل فونت داخل repo قرار داده نشده و نباید commit شود.
