import jwt
from django.conf import settings
from django.contrib.auth import get_user_model
from django.core.mail import send_mail
from django.urls import reverse
from django.contrib.auth.tokens import PasswordResetTokenGenerator
from django.utils.encoding import smart_bytes
from django.utils.http import urlsafe_base64_encode
from rest_framework import generics, status, views
from rest_framework.response import Response
from rest_framework_simplejwt.tokens import RefreshToken

from .serializers import (
    RegisterSerializer,
    SetNewPasswordSerializer,
    PasswordResetRequestSerializer,
)

User = get_user_model()


def send_verification_email(user, request):
    """
    Sends a verification email to the user.
    """
    token = RefreshToken.for_user(user).access_token
    relative_link = reverse('verify-email')
    abs_url = request.build_absolute_uri(relative_link) + "?token=" + str(token)

    email_subject = 'Verify your email'
    email_body = f'Hi {user.username}, please use the link below to verify your email:\n{abs_url}'

    send_mail(
        email_subject,
        email_body,
        settings.DEFAULT_FROM_EMAIL,
        [user.email],
        fail_silently=False,
    )


class RegisterView(generics.GenericAPIView):
    """
    API view for user registration.
    """
    serializer_class = RegisterSerializer

    def post(self, request):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = serializer.save()

        # Send verification email
        send_verification_email(user, request)

        return Response(
            {
                "user": serializer.data,
                "message": "User created successfully. Check your email to verify your account.",
            },
            status=status.HTTP_201_CREATED,
        )


class VerifyEmailView(views.APIView):
    """
    API view to verify user's email.
    """
    def get(self, request):
        token = request.GET.get('token')
        try:
            payload = jwt.decode(token, settings.SECRET_KEY, algorithms=['HS256'])
            user = User.objects.get(id=payload['user_id'])
            if not user.is_verified:
                user.is_verified = True
                user.save()
            return Response({'message': 'Successfully activated'}, status=status.HTTP_200_OK)
        except jwt.ExpiredSignatureError:
            return Response({'error': 'Activation link expired'}, status=status.HTTP_400_BAD_REQUEST)
        except jwt.exceptions.DecodeError:
            return Response({'error': 'Invalid token'}, status=status.HTTP_400_BAD_REQUEST)


class PasswordResetRequestView(generics.GenericAPIView):
    """
    API view to request a password reset.
    """
    serializer_class = PasswordResetRequestSerializer

    def post(self, request):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        email = serializer.validated_data['email']

        user = User.objects.filter(email=email).first()
        if user:
            # Generate token and send email
            uidb64 = urlsafe_base64_encode(smart_bytes(user.id))
            token = PasswordResetTokenGenerator().make_token(user)

            relative_link = reverse('password-reset-confirm', kwargs={'uidb64': uidb64, 'token': token})
            abs_url = request.build_absolute_uri(relative_link)

            email_subject = 'Reset your password'
            email_body = f'Hi {user.username}, please use the link below to reset your password:\n{abs_url}'

            send_mail(
                email_subject,
                email_body,
                settings.DEFAULT_FROM_EMAIL,
                [user.email],
                fail_silently=False,
            )

        return Response(
            {'message': 'If an account with this email exists, a password reset link has been sent.'},
            status=status.HTTP_200_OK,
        )


class PasswordResetConfirmView(generics.GenericAPIView):
    """
    API view to confirm a password reset.
    """
    serializer_class = SetNewPasswordSerializer

    def patch(self, request, *args, **kwargs):
        serializer = self.get_serializer(
            data=request.data, context={'uidb64': kwargs['uidb64'], 'token': kwargs['token']}
        )
        serializer.is_valid(raise_exception=True)
        return Response({'message': 'Password reset successful'}, status=status.HTTP_200_OK)


class LogoutView(views.APIView):
    """
    API view for user logout.
    """
    def post(self, request):
        try:
            refresh_token = request.data["refresh"]
            token = RefreshToken(refresh_token)
            token.blacklist()
            return Response(status=status.HTTP_205_RESET_CONTENT)
        except Exception as e:
            return Response(status=status.HTTP_400_BAD_REQUEST)
