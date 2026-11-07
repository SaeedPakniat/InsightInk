from django.contrib.auth import get_user_model
from django.contrib.auth.password_validation import validate_password
from django.core.exceptions import ValidationError as DjangoValidationError
from django.db import IntegrityError, transaction
from rest_framework import serializers
from rest_framework.validators import UniqueValidator

from content.language_filters import validate_active_language_codes
from content.models import ContentLanguage, Topic
from content.serializers import ContentLanguageSerializer, TopicSerializer

from .models import UserContentLanguage, UserInterest
from .permissions import is_admin, is_moderator


User = get_user_model()


class CurrentUserSerializer(serializers.ModelSerializer):
    capabilities = serializers.SerializerMethodField()

    class Meta:
        model = User
        fields = (
            "id",
            "email",
            "display_name",
            "preferred_ui_language",
            "capabilities",
        )
        read_only_fields = fields

    def get_capabilities(self, user):
        admin = is_admin(user)
        return {
            "can_moderate": is_moderator(user) or admin,
            "can_administer": admin,
        }


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


class InterestSelectionSerializer(serializers.Serializer):
    topics = serializers.PrimaryKeyRelatedField(
        queryset=Topic.objects.filter(is_active=True),
        many=True,
        allow_empty=True,
    )

    def validate_topics(self, topics):
        topic_ids = [topic.id for topic in topics]
        if len(topic_ids) != len(set(topic_ids)):
            raise serializers.ValidationError("Duplicate topics are not allowed.")
        return topics


class CurrentInterestsSerializer(serializers.Serializer):
    topics = TopicSerializer(many=True, read_only=True)


class ContentLanguageSelectionSerializer(serializers.Serializer):
    languages = serializers.ListField(
        child=serializers.CharField(max_length=35),
        allow_empty=True,
    )

    def validate_languages(self, codes):
        validated_codes = validate_active_language_codes(codes)
        languages = {
            language.code: language
            for language in ContentLanguage.objects.filter(code__in=validated_codes)
        }
        return [languages[code] for code in validated_codes]


class CurrentContentLanguagesSerializer(serializers.Serializer):
    languages = ContentLanguageSerializer(many=True, read_only=True)
