# Django REST Authentication Service

This directory contains a standalone Django REST Framework application that provides a complete user authentication system. It is designed to be easily integrated with a frontend application or other services.

## Features

- **User Registration**: New users can sign up.
- **Email Verification**: Users must verify their email address to activate their account.
- **JWT Authentication**: Secure token-based authentication using JSON Web Tokens (JWT).
- **Login/Logout**: Users can log in to receive a token and log out to invalidate it.
- **Password Reset**: A secure, email-based password reset flow.
- **Custom User Model**: The user model can be easily extended.

## Prerequisites

- Python 3.8+
- `pip` and `venv`

## Setup and Installation

1.  **Navigate to the `backend` directory:**
    ```bash
    cd backend
    ```

2.  **Create and activate a virtual environment:**
    ```bash
    python -m venv venv
    source venv/bin/activate  # On Windows, use `venv\Scripts\activate`
    ```

3.  **Install the dependencies:**
    ```bash
    pip install -r requirements.txt
    ```

4.  **Run database migrations:**
    This is the step that failed in the automated environment but should work on your local machine. These commands create the database and the necessary tables for the application.
    ```bash
    python manage.py makemigrations accounts
    python manage.py migrate
    ```

5.  **Run the development server:**
    ```bash
    python manage.py runserver
    ```
    The API will be available at `http://127.0.0.1:8000/`.

## API Endpoints

All endpoints are prefixed with `/api/auth/`.

### Registration

- **URL**: `/register/`
- **Method**: `POST`
- **Body**:
  ```json
  {
      "username": "yourusername",
      "email": "youremail@example.com",
      "password": "yourpassword"
  }
  ```
- **Success Response**: `201 CREATED`
  - Sends a verification email to the user.

### Email Verification

- **URL**: `/verify-email/?token=<token>`
- **Method**: `GET`
- **Description**: This link is sent to the user's email. Opening it verifies the account.

### Login

- **URL**: `/login/`
- **Method**: `POST`
- **Body**:
  ```json
  {
      "username": "yourusername",
      "password": "yourpassword"
  }
  ```
- **Success Response**: `200 OK`
  ```json
  {
      "access": "<access_token>",
      "refresh": "<refresh_token>"
  }
  ```

### Refresh Token

- **URL**: `/login/refresh/`
- **Method**: `POST`
- **Body**:
  ```json
  {
      "refresh": "<refresh_token>"
  }
  ```
- **Success Response**: `200 OK`
  ```json
  {
      "access": "<new_access_token>"
  }
  ```

### Logout

- **URL**: `/logout/`
- **Method**: `POST`
- **Body**:
  ```json
  {
      "refresh": "<refresh_token>"
  }
  ```
- **Description**: Blacklists the refresh token to log the user out.
- **Success Response**: `205 RESET CONTENT`

### Password Reset Request

- **URL**: `/password-reset/`
- **Method**: `POST`
- **Body**:
  ```json
  {
      "email": "youremail@example.com"
  }
  ```
- **Success Response**: `200 OK`
  - If the email exists, a password reset link is sent.

### Password Reset Confirmation

- **URL**: `/password-reset-confirm/<uidb64>/<token>/`
- **Method**: `PATCH`
- **Description**: This link is sent to the user's email.
- **Body**:
    ```json
    {
        "password": "yournewpassword"
    }
    ```
- **Success Response**: `200 OK`
