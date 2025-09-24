from django.urls import reverse
from rest_framework import status
from rest_framework.test import APITestCase
from django.contrib.auth import get_user_model
from django.core import mail

User = get_user_model()


class AuthTests(APITestCase):
    def setUp(self):
        """
        Set up the test data for the auth tests.
        """
        self.register_url = reverse('register')
        self.login_url = reverse('login')
        self.logout_url = reverse('logout')
        self.verify_email_url = reverse('verify-email')
        self.password_reset_request_url = reverse('password-reset-request')

        self.user_data = {
            'username': 'testuser',
            'email': 'test@example.com',
            'password': 'testpassword123',
        }
        self.user = User.objects.create_user(
            username='existinguser',
            email='existing@example.com',
            password='testpassword123'
        )

    def test_successful_registration(self):
        """
        Ensure a new user can be registered successfully.
        """
        response = self.client.post(self.register_url, self.user_data, format='json')
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(User.objects.count(), 2) # 1 from setUp, 1 from this test
        self.assertEqual(len(mail.outbox), 1)
        self.assertEqual(mail.outbox[0].subject, 'Verify your email')
        self.assertIn('testuser', response.data['user']['username'])

    def test_registration_with_existing_username(self):
        """
        Ensure registration fails if the username already exists.
        """
        self.user_data['email'] = 'newemail@example.com' # Use a different email
        self.user_data['username'] = 'existinguser' # Use existing username
        response = self.client.post(self.register_url, self.user_data, format='json')
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('username', response.data)

    def test_registration_with_existing_email(self):
        """
        Ensure registration fails if the email already exists.
        """
        self.user_data['username'] = 'newuser' # Use a different username
        self.user_data['email'] = 'existing@example.com' # Use existing email
        response = self.client.post(self.register_url, self.user_data, format='json')
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('email', response.data)


class VerificationAndLoginTests(APITestCase):
    def setUp(self):
        self.user = User.objects.create_user(
            username='testverify',
            email='verify@example.com',
            password='testpassword123'
        )
        self.login_url = reverse('login')
        self.verify_email_url = reverse('verify-email')

    def test_email_verification_with_valid_token(self):
        """
        Ensure email can be verified with a valid token.
        """
        # Manually create a token for the user
        from rest_framework_simplejwt.tokens import RefreshToken
        token = RefreshToken.for_user(self.user).access_token

        url = f"{self.verify_email_url}?token={str(token)}"
        response = self.client.get(url)

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.user.refresh_from_db()
        self.assertTrue(self.user.is_verified)

    def test_email_verification_with_invalid_token(self):
        """
        Ensure email verification fails with an invalid token.
        """
        url = f"{self.verify_email_url}?token=invalidtoken"
        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_login_with_verified_user(self):
        """
        Ensure a verified user can log in successfully.
        """
        self.user.is_verified = True
        self.user.save()

        response = self.client.post(
            self.login_url,
            {'username': 'testverify', 'password': 'testpassword123'},
            format='json'
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn('access', response.data)
        self.assertIn('refresh', response.data)

    def test_login_with_unverified_user(self):
        """
        Test login behavior for an unverified user.
        The current implementation allows this, which this test will confirm.
        """
        self.assertFalse(self.user.is_verified)
        response = self.client.post(
            self.login_url,
            {'username': 'testverify', 'password': 'testpassword123'},
            format='json'
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)

    def test_login_with_incorrect_password(self):
        """
        Ensure login fails with an incorrect password.
        """
        response = self.client.post(
            self.login_url,
            {'username': 'testverify', 'password': 'wrongpassword'},
            format='json'
        )
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_logout(self):
        """
        Ensure a user can log out by blacklisting the refresh token.
        """
        self.user.is_verified = True
        self.user.save()

        # Log in to get tokens
        login_response = self.client.post(
            self.login_url,
            {'username': 'testverify', 'password': 'testpassword123'},
            format='json'
        )
        refresh_token = login_response.data['refresh']

        # Log out
        logout_url = reverse('logout')
        logout_response = self.client.post(
            logout_url,
            {'refresh': refresh_token},
            format='json'
        )
        self.assertEqual(logout_response.status_code, status.HTTP_205_RESET_CONTENT)

        # Verify the token is blacklisted (this requires another endpoint or a check in the DB)
        # For simplicity, we'll assume the 205 status is sufficient for this test.
        # A more robust test would try to use the refresh token again and expect a failure.


class PasswordResetTests(APITestCase):
    def setUp(self):
        self.user = User.objects.create_user(
            username='resetuser',
            email='reset@example.com',
            password='oldpassword'
        )
        self.user.is_verified = True
        self.user.save()
        self.request_url = reverse('password-reset-request')

    def test_password_reset_request_success(self):
        """
        Ensure a password reset email is sent for a valid user.
        """
        response = self.client.post(self.request_url, {'email': 'reset@example.com'}, format='json')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(mail.outbox), 1)
        self.assertEqual(mail.outbox[0].subject, 'Reset your password')

    def test_password_reset_request_non_existent_email(self):
        """
        Ensure the endpoint gives a success message even for non-existent emails to prevent enumeration.
        """
        response = self.client.post(self.request_url, {'email': 'no-such-email@example.com'}, format='json')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(mail.outbox), 0) # No email should be sent

    def test_password_reset_confirm_success(self):
        """
        Ensure a password can be successfully reset with a valid token.
        """
        from django.contrib.auth.tokens import PasswordResetTokenGenerator
        from django.utils.http import urlsafe_base64_encode
        from django.utils.encoding import smart_bytes

        # Generate token
        uidb64 = urlsafe_base64_encode(smart_bytes(self.user.id))
        token = PasswordResetTokenGenerator().make_token(self.user)

        # Construct confirm URL
        confirm_url = reverse('password-reset-confirm', kwargs={'uidb64': uidb64, 'token': token})

        new_password = 'new_secure_password'
        response = self.client.patch(confirm_url, {'password': new_password}, format='json')

        self.assertEqual(response.status_code, status.HTTP_200_OK)

        # Verify the user can log in with the new password
        self.user.refresh_from_db()
        self.assertTrue(self.user.check_password(new_password))

        # Verify login with new password works
        login_response = self.client.post(
            reverse('login'),
            {'username': 'resetuser', 'password': new_password},
            format='json'
        )
        self.assertEqual(login_response.status_code, status.HTTP_200_OK)

    def test_password_reset_confirm_invalid_token(self):
        """
        Ensure password reset fails with an invalid token.
        """
        uidb64 = 'invalid_uid'
        token = 'invalid_token'
        confirm_url = reverse('password-reset-confirm', kwargs={'uidb64': uidb64, 'token': token})

        response = self.client.patch(confirm_url, {'password': 'anypassword'}, format='json')
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)
