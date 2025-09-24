from django.test import TestCase
from rest_framework.test import APITestCase
from django.urls import reverse
from rest_framework import status
from django.core import mail
from django.conf import settings

class CORSTests(APITestCase):
    def test_cors_headers_present(self):
        """
        Ensure that CORS headers are present in the response for a cross-origin request.
        """
        # Make a request from a different origin
        response = self.client.post(reverse('register'), data={}, HTTP_ORIGIN='http://localhost:3000')

        # Check for the Access-Control-Allow-Origin header
        self.assertIn('Access-Control-Allow-Origin', response)
        self.assertEqual(response['Access-Control-Allow-Origin'], 'http://localhost:3000')

class ThrottlingTests(APITestCase):
    def test_anon_rate_throttle(self):
        """
        Ensure that anonymous requests are throttled after exceeding the rate limit.
        """
        url = reverse('register')
        data = {
            'email': 'test@example.com',
            'password': 'password123'
        }

        # The default anon throttle rate is '10/minute'
        # Make 10 requests
        for i in range(10):
            response = self.client.post(url, data)
            # We don't check the status code here, as it could be a validation error
            # We only care that it's not a throttle error yet.
            # But for simplicity, we'll just make the requests.

        # The 11th request should be throttled
        response = self.client.post(url, data)
        self.assertEqual(response.status_code, status.HTTP_429_TOO_MANY_REQUESTS)
