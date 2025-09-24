
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
=======
from django.urls import reverse
from rest_framework.test import APITestCase
from rest_framework import status
from django.contrib.auth import get_user_model
from django.core import mail
from rest_framework_simplejwt.tokens import RefreshToken
from django.utils.http import urlsafe_base64_encode
from django.utils.encoding import smart_bytes
from django.contrib.auth.tokens import PasswordResetTokenGenerator

User = get_user_model()


class AuthAPITestCase(APITestCase):
    """
    Test suite for the authentication API endpoints.
    """

    def setUp(self):
        """
        Set up initial data for the tests.
        """
        self.username = 'testuser'
        self.email = 'test@example.com'
        self.password = 'strongpassword123'

        # Create a user for login and authenticated tests
        self.user = User.objects.create_user(
            username=self.username,
            email=self.email,
            password=self.password
        )

        # URLs
        self.register_url = reverse('register')
        self.login_url = reverse('token_obtain_pair')
        self.logout_url = reverse('logout')
        self.verify_email_url = reverse('verify-email')
        self.password_reset_url = reverse('password-reset')

    def test_user_registration_success(self):
        """
        Test successful user registration.
        """
        data = {
            'username': 'newuser',
            'email': 'newuser@example.com',
            'password': self.password,
        }
        response = self.client.post(self.register_url, data)
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(User.objects.count(), 2) # setUp user + new user
        # Test that an email was sent
        self.assertEqual(len(mail.outbox), 1)
        self.assertEqual(mail.outbox[0].subject, 'Verify your email')

    def test_user_registration_duplicate_username(self):
        """
        Test registration with a username that already exists.
        """
        data = {
            'username': self.username, # Existing username
            'email': 'another@example.com',
            'password': self.password,
        }
        response = self.client.post(self.register_url, data)
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_email_verification_success(self):
        """
        Test successful email verification.
        """
        # The user created in setUp is not verified by default
        self.user.is_verified = False
        self.user.save()

        # Generate a verification token
        token = RefreshToken.for_user(self.user).access_token
        url = f"{self.verify_email_url}?token={str(token)}"

        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)

        self.user.refresh_from_db()
        self.assertTrue(self.user.is_verified)

    def test_email_verification_invalid_token(self):
        """
        Test email verification with an invalid token.
        """
        url = f"{self.verify_email_url}?token=invalidtoken"
        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_user_login_success(self):
        """
        Test successful user login and token generation.
        """
        data = {'username': self.username, 'password': self.password}
        response = self.client.post(self.login_url, data)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn('access', response.data)
        self.assertIn('refresh', response.data)

    def test_user_logout_success(self):
        """
        Test successful user logout by blacklisting the refresh token.
        """
        # First, log in to get tokens
        login_data = {'username': self.username, 'password': self.password}
        login_response = self.client.post(self.login_url, login_data)
        refresh_token = login_response.data['refresh']

        # Now, logout
        logout_data = {'refresh': refresh_token}
        response = self.client.post(self.logout_url, logout_data)
        self.assertEqual(response.status_code, status.HTTP_205_RESET_CONTENT)

        # Verify the token is blacklisted by trying to refresh it
        refresh_url = reverse('token_refresh')
        refresh_response = self.client.post(refresh_url, {'refresh': refresh_token})
        self.assertEqual(refresh_response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_password_reset_request_success(self):
        """
        Test that a password reset email is sent for a valid email.
        """
        data = {'email': self.email}
        response = self.client.post(self.password_reset_url, data)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        # Check that an email was sent
        self.assertEqual(len(mail.outbox), 1)
        self.assertEqual(mail.outbox[0].subject, 'Reset your password')

    def test_password_reset_confirm_success(self):
        """
        Test successfully setting a new password with a valid token.
        """
        # Generate a password reset token
        uidb64 = urlsafe_base64_encode(smart_bytes(self.user.pk))
        token = PasswordResetTokenGenerator().make_token(self.user)

        url = reverse('password-reset-confirm', kwargs={'uidb64': uidb64, 'token': token})

        new_password = 'newpassword123'
        data = {
            'password': new_password,
            'token': token,
            'uidb64': uidb64
        }

        response = self.client.patch(url, data)
        self.assertEqual(response.status_code, status.HTTP_200_OK)

        # Verify the password was actually changed by trying to log in with it
        self.user.refresh_from_db()
        self.assertTrue(self.user.check_password(new_password))
main
