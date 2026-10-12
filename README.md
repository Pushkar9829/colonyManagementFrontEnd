# ColonyHub web app (frontend)

The web app for ColonyHub — every role (society admin/committee, accountant, facility manager, guard, staff,
resident, platform owner) in one installable PWA, in English, Hindi and Marathi, with light and dark themes.
The API lives in a separate repo, **colonyManagementBackend**.

Stack: React 19, Vite, Tailwind CSS v4, TanStack Query, React Router.

## Run locally

```bash
cp .env.example .env        # VITE_API_URL=http://localhost:5000/api/v1
npm install
npm run dev                 # http://localhost:5173
```

Tests: `npm test` · Production build: `npm run build`

## Deploy on Vercel

1. Vercel → New project → this repo (framework preset **Vite**; build `npm run build`, output `dist`).
2. Environment variables:
   - `VITE_API_URL` = `https://<your-api>.onrender.com/api/v1`
   - `VITE_DEMO_MODE` = `true` for a demo (shows one-click demo logins on the login page)
3. Deploy. `vercel.json` sends every route to `index.html`, so deep links and refreshes work.

The API allows any origin by default, so nothing else is needed once the Vercel URL is known.
