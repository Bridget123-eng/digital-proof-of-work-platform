# Render Deployment Checklist

## Render Service Settings

Root Directory:

```text
backend
```

Build Command:

```text
npm install
```

Start Command:

```text
npm start
```

## Required Environment Variables

```text
NODE_ENV=production
FRONTEND_URL=https://your-vercel-frontend.vercel.app
APP_ORIGIN=https://your-vercel-frontend.vercel.app
MONGO_URI=your_mongodb_atlas_uri_with_encoded_password
JWT_SECRET=your_strong_jwt_secret
JWT_EXPIRES_IN=7d
OTP_EXPIRES_IN_MINUTES=10
CLOUDINARY_CLOUD_NAME=your_cloudinary_cloud_name
CLOUDINARY_API_KEY=your_cloudinary_api_key
CLOUDINARY_API_SECRET=your_cloudinary_api_secret
```

## Optional SMTP Variables

```text
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your_email@gmail.com
SMTP_PASS=your_16_digit_gmail_app_password_without_spaces
SMTP_FROM=Auth App <your_email@gmail.com>
```

If SMTP variables are missing, the backend still starts. Email-dependent auth actions return a clean `503` response instead of crashing the server.

## Why SMTP Cannot Crash Startup

Render needs the server process to start before it can pass health checks. SMTP providers can reject credentials, app passwords, or network auth during deployment. The backend now treats SMTP as optional during startup:

- Missing SMTP variables log a warning.
- No SMTP verification runs during production startup.
- `GET /api/health` still responds.
- Email-required routes return a controlled error when email is unavailable.

## MongoDB Password Encoding

MongoDB is required. If the MongoDB password contains special characters, encode the password before placing it in `MONGO_URI`.

Example:

```text
Original password: my@pass#123
Encoded password:  my%40pass%23123
```

Correct URI format:

```text
MONGO_URI=mongodb+srv://username:encodedPassword@cluster.mongodb.net/dbname?retryWrites=true&w=majority
```

Common characters to encode include:

```text
@ # $ % : / ? & =
```

## Health Check

After deployment, test:

```text
GET https://your-render-service.onrender.com/api/health
```

Expected response shape:

```json
{
  "success": true,
  "message": "Backend is running",
  "environment": "production",
  "emailService": "configured"
}
```

`emailService` can also be `"not_configured"` when SMTP is intentionally omitted.

## Final Deployment Testing Steps

1. Deploy backend on Render with `Root Directory` set to `backend`.
2. Confirm Render logs show MongoDB connected.
3. Open `/api/health` and confirm the backend responds.
4. Deploy frontend on Vercel.
5. Set frontend API URL to the Render backend URL.
6. Register/login with a student account.
7. Test password reset or OTP email flow.
8. If email returns `503`, add valid SMTP variables and redeploy.
