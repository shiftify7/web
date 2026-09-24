# Shiftify frontend

Public marketing site (Astro 5 + Tailwind v4 + Preact islands).

```
cd frontend
npm install
cp .env.example .env
npm run dev      # http://localhost:4321
npm run build
```

Leads post to `/api/lead` (Cloudflare Pages Functions in `functions/`). Set `BACKEND_URL` in Pages env so the function proxies to `../backend`.

This folder is isolated from `crm-frontend/` and `backend/`.
