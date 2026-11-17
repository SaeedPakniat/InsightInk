"""
ASGI config for InsightInk.

HTTP continues through Django. Authenticated WebSocket connections use the
existing Django session cookie and are routed to the messaging delivery consumer.
"""

import os

from channels.auth import AuthMiddlewareStack
from channels.routing import ProtocolTypeRouter, URLRouter
from channels.security.websocket import AllowedHostsOriginValidator
from django.core.asgi import get_asgi_application


os.environ.setdefault("DJANGO_SETTINGS_MODULE", "config.settings")

django_asgi_application = get_asgi_application()

from messaging.routing import websocket_urlpatterns  # noqa: E402


application = ProtocolTypeRouter(
    {
        "http": django_asgi_application,
        "websocket": AllowedHostsOriginValidator(
            AuthMiddlewareStack(
                URLRouter(websocket_urlpatterns)
            )
        ),
    }
)
