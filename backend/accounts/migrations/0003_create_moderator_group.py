from django.db import migrations


MODERATOR_GROUP_NAME = "Moderator"


def create_moderator_group(apps, schema_editor):
    group_model = apps.get_model("auth", "Group")
    group_model.objects.get_or_create(name=MODERATOR_GROUP_NAME)


class Migration(migrations.Migration):

    dependencies = [
        ("accounts", "0002_alter_user_managers_remove_user_username_and_more"),
    ]

    operations = [
        migrations.RunPython(create_moderator_group, migrations.RunPython.noop),
    ]
