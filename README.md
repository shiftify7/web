# Shiftify

Monorepo layout:

```
frontend/        Public marketing website (Astro)
crm-frontend/    Owner CRM (Preact)
backend/         API, MongoDB, email, Cloudinary, OTP
```

## Frontend

```bash
cd frontend
npm install
npm run dev
```

## Backend

```bash
cd backend
cp .env.example .env
npm install
npm start
```

## CRM

```bash
cd crm-frontend
cp .env.example .env
npm install
npm run dev
```

See `frontend/DEPLOY.md` and `IMPLEMENTATION.md`.
