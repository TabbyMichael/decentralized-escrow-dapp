from django.contrib.auth.models import AbstractUser
from django.db import models


class User(AbstractUser):
    """
    Custom user model that extends the default Django user.
    This model is used to add extra fields to the user profile.
    """

    # Add an email verification status field
    is_verified = models.BooleanField(default=False)

    def __str__(self):
        return self.username
