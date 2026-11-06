from django.db import migrations


DEFAULT_CODES = ("en", "fa")


def add_existing_user_defaults(apps, schema_editor):
    User = apps.get_model("accounts", "User")
    UserContentLanguage = apps.get_model("accounts", "UserContentLanguage")
    ContentLanguage = apps.get_model("content", "ContentLanguage")

    languages = list(
        ContentLanguage.objects.filter(code__in=DEFAULT_CODES, is_active=True)
    )
    UserContentLanguage.objects.bulk_create(
        [
            UserContentLanguage(user=user, language=language)
            for user in User.objects.all().iterator()
            for language in languages
        ],
        ignore_conflicts=True,
    )


def remove_existing_user_defaults(apps, schema_editor):
    UserContentLanguage = apps.get_model("accounts", "UserContentLanguage")
    UserContentLanguage.objects.filter(language_id__in=DEFAULT_CODES).delete()


class Migration(migrations.Migration):
    dependencies = [
        ("accounts", "0005_usercontentlanguage"),
        ("content", "0003_seed_content_languages"),
    ]

    operations = [
        migrations.RunPython(
            add_existing_user_defaults,
            remove_existing_user_defaults,
        ),
    ]
