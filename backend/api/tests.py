from django.test import SimpleTestCase
from django.urls import reverse
from rest_framework.test import APIClient


class HealthEndpointTests(SimpleTestCase):
    def setUp(self):
        self.client = APIClient()
        self.url = reverse("api:health")

    def test_get_returns_http_200(self):
        self.assertEqual(self.url, "/api/v1/health/")

        response = self.client.get(self.url)

        self.assertEqual(response.status_code, 200)

    def test_response_body_matches_stable_contract(self):
        response = self.client.get(self.url)

        self.assertEqual(response.json(), {"status": "ok"})

    def test_response_content_type_is_json(self):
        response = self.client.get(self.url)

        self.assertEqual(response.headers["Content-Type"], "application/json")

    def test_endpoint_requires_no_authentication(self):
        response = APIClient().get(self.url)

        self.assertEqual(response.status_code, 200)

    def test_mutation_methods_are_rejected(self):
        for method in ("post", "put", "patch", "delete"):
            with self.subTest(method=method):
                response = getattr(self.client, method)(self.url, data={})

                self.assertEqual(response.status_code, 405)
