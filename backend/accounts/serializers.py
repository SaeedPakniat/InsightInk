from django.contrib.auth import get_user_model
from django.contrib.auth.password_validation import validate_password
from django.core.exceptions import ValidationError as DjangoValidationError
from django.db import IntegrityError, transaction
from rest_framework import serializers
from rest_framework.validators import UniqueValidator


User = get_user_model()


class CurrentUserSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ("id", "email", "display_name", "preferred_ui_language")
        read_only_fields = fields


class RegisterSerializer(serializers.Serializer):
    email = serializers.EmailField(
        validators=[
            UniqueValidator(
                queryset=User.objects.all(),
                message="A user with this email address already exists.",
            )
        ]
    )
    password = serializers.CharField(trim_whitespace=False, write_only=True)
    display_name = serializers.CharField(
        max_length=User._meta.get_field("display_name").max_length,
        allow_blank=True,
        required=False,
    )
    preferred_ui_language = serializers.ChoiceField(
        choices=User.Language.choices,
        required=False,
    )

    def validate(self, attrs):
        candidate = User(
            email=attrs["email"],
            display_name=attrs.get("display_name", ""),
            preferred_ui_language=attrs.get(
                "preferred_ui_language",
                User.Language.PERSIAN,
            ),
        )
        try:
            validate_password(attrs["password"], user=candidate)
        except DjangoValidationError as exc:
            raise serializers.ValidationError({"password": exc.messages}) from exc
        return attrs

    def create(self, validated_data):
        try:
            with transaction.atomic():
                return User.objects.create_user(**validated_data)
        except IntegrityError as exc:
            raise serializers.ValidationError(
                {"email": ["A user with this email address already exists."]}
            ) from exc


class LoginSerializer(serializers.Serializer):
    email = serializers.EmailField()
    password = serializers.CharField(trim_whitespace=False, write_only=True)

    def validate_email(self, value):
        return User.objects.normalize_email(value)
