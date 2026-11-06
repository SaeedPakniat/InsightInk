from django.db import migrations


LANGUAGES = [
    ("en", "English", "انگلیسی", "English", 1),
    ("zh", "Chinese", "چینی", "中文", 2),
    ("hi", "Hindi", "هندی", "हिन्दी", 3),
    ("es", "Spanish", "اسپانیایی", "Español", 4),
    ("ar", "Arabic", "عربی", "العربية", 5),
    ("fr", "French", "فرانسوی", "Français", 6),
    ("bn", "Bengali", "بنگالی", "বাংলা", 7),
    ("pt", "Portuguese", "پرتغالی", "Português", 8),
    ("ru", "Russian", "روسی", "Русский", 9),
    ("ur", "Urdu", "اردو", "اردو", 10),
    ("id", "Indonesian", "اندونزیایی", "Bahasa Indonesia", 11),
    ("de", "German", "آلمانی", "Deutsch", 12),
    ("ja", "Japanese", "ژاپنی", "日本語", 13),
    ("sw", "Swahili", "سواحیلی", "Kiswahili", 14),
    ("mr", "Marathi", "مراتی", "मराठी", 15),
    ("te", "Telugu", "تلوگو", "తెలుగు", 16),
    ("tr", "Turkish", "ترکی", "Türkçe", 17),
    ("ta", "Tamil", "تامیلی", "தமிழ்", 18),
    ("vi", "Vietnamese", "ویتنامی", "Tiếng Việt", 19),
    ("ko", "Korean", "کره‌ای", "한국어", 20),
    ("fa", "Persian", "فارسی", "فارسی", 21),
    ("it", "Italian", "ایتالیایی", "Italiano", 22),
    ("th", "Thai", "تایلندی", "ไทย", 23),
    ("pl", "Polish", "لهستانی", "Polski", 24),
    ("uk", "Ukrainian", "اوکراینی", "Українська", 25),
    ("nl", "Dutch", "هلندی", "Nederlands", 26),
    ("ms", "Malay", "مالایی", "Bahasa Melayu", 27),
    ("fil", "Filipino", "فیلیپینی", "Filipino", 28),
    ("he", "Hebrew", "عبری", "עברית", 29),
    ("el", "Greek", "یونانی", "Ελληνικά", 30),
    ("cs", "Czech", "چکی", "Čeština", 31),
    ("ro", "Romanian", "رومانیایی", "Română", 32),
    ("hu", "Hungarian", "مجاری", "Magyar", 33),
    ("sv", "Swedish", "سوئدی", "Svenska", 34),
    ("da", "Danish", "دانمارکی", "Dansk", 35),
    ("no", "Norwegian", "نروژی", "Norsk", 36),
    ("fi", "Finnish", "فنلاندی", "Suomi", 37),
    ("pa", "Punjabi", "پنجابی", "ਪੰਜਾਬੀ", 38),
    ("gu", "Gujarati", "گجراتی", "ગુજરાતી", 39),
    ("kn", "Kannada", "کانّادا", "ಕನ್ನಡ", 40),
    ("ml", "Malayalam", "مالایالم", "മലയാളം", 41),
    ("ne", "Nepali", "نپالی", "नेपाली", 42),
    ("si", "Sinhala", "سینهالی", "සිංහල", 43),
    ("my", "Burmese", "برمه‌ای", "မြန်မာဘာသာ", 44),
    ("km", "Khmer", "خِمِر", "ខ្មែរ", 45),
    ("lo", "Lao", "لائوسی", "ລາວ", 46),
    ("am", "Amharic", "امهری", "አማርኛ", 47),
    ("so", "Somali", "سومالیایی", "Soomaali", 48),
    ("ha", "Hausa", "هوسا", "Hausa", 49),
    ("yo", "Yoruba", "یوروبا", "Yorùbá", 50),
    ("ig", "Igbo", "ایگبو", "Igbo", 51),
    ("zu", "Zulu", "زولو", "isiZulu", 52),
    ("af", "Afrikaans", "آفریکانس", "Afrikaans", 53),
    ("bg", "Bulgarian", "بلغاری", "Български", 54),
    ("sr", "Serbian", "صربی", "Српски", 55),
    ("hr", "Croatian", "کرواتی", "Hrvatski", 56),
    ("sk", "Slovak", "اسلواکی", "Slovenčina", 57),
    ("sl", "Slovenian", "اسلوونیایی", "Slovenščina", 58),
    ("lt", "Lithuanian", "لیتوانیایی", "Lietuvių", 59),
    ("lv", "Latvian", "لتونیایی", "Latviešu", 60),
    ("et", "Estonian", "استونیایی", "Eesti", 61),
    ("ca", "Catalan", "کاتالان", "Català", 62),
]


def seed_languages(apps, schema_editor):
    ContentLanguage = apps.get_model("content", "ContentLanguage")
    for code, name_en, name_fa, native_name, display_order in LANGUAGES:
        ContentLanguage.objects.update_or_create(
            code=code,
            defaults={
                "name_en": name_en,
                "name_fa": name_fa,
                "native_name": native_name,
                "is_active": True,
                "display_order": display_order,
            },
        )


def unseed_languages(apps, schema_editor):
    ContentLanguage = apps.get_model("content", "ContentLanguage")
    ContentLanguage.objects.filter(
        code__in=[row[0] for row in LANGUAGES]
    ).delete()


class Migration(migrations.Migration):
    dependencies = [
        ("content", "0002_contentlanguage_alter_idea_language_and_more"),
    ]

    operations = [
        migrations.RunPython(seed_languages, unseed_languages),
    ]
