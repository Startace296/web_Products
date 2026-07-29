# TechPulse — Deployment Guide

Frontend (Next.js) → **Vercel**. Backend (Express) → **Railway**. MySQL → **Railway plugin** (recommended) or **PlanetScale**.

Frontend and backend end up on two *different* domains (e.g. `techpulse.vercel.app` and `techpulse-production.up.railway.app`) — not just different ports like in local dev. Several things in the codebase were already built specifically to handle that (cross-site cookie, `trust proxy`, CORS) — this guide tells you where and why.

---

## 0. Before you start

- A GitHub repo with this project pushed (Vercel/Railway both deploy from a Git repo).
- Accounts: [vercel.com](https://vercel.com), [railway.app](https://railway.app), and either Railway's own MySQL plugin or [planetscale.com](https://planetscale.com).
- Generate two strong, independent JWT secrets — do **not** reuse the `dev-only-...` placeholders from local `.env`:
  ```bash
  openssl rand -base64 48
  ```
  Run it twice: once for `JWT_ACCESS_SECRET`, once for `JWT_REFRESH_SECRET`.

---

## 1. Database — MySQL

### Option A: Railway MySQL plugin (recommended, simplest)

1. In your Railway project, **New → Database → Add MySQL**.
2. Railway provisions it and exposes connection variables (`MYSQLHOST`, `MYSQLPORT`, `MYSQLUSER`, `MYSQLPASSWORD`, `MYSQLDATABASE`) automatically to any service in the same project.
3. Prisma needs one combined `DATABASE_URL`, not the separate parts. In your **backend service's** variables (not the DB plugin's), set:
   ```
   DATABASE_URL=mysql://${{MySQL.MYSQLUSER}}:${{MySQL.MYSQLPASSWORD}}@${{MySQL.MYSQLHOST}}:${{MySQL.MYSQLPORT}}/${{MySQL.MYSQLDATABASE}}
   ```
   Railway's `${{ServiceName.VAR}}` syntax references another service's variable — adjust `MySQL` to whatever you named the database service.

Foreign keys, cascades, and everything in `prisma/schema.prisma` work exactly as they do locally — Railway MySQL is a regular, unrestricted MySQL instance.

### Option B: PlanetScale — important caveat

This schema relies heavily on `onDelete: Cascade` / `onDelete: SetNull` foreign keys (every model does). **PlanetScale historically does not enforce foreign key constraints by default** (it's built around online schema changes that assume no FKs). If you go this route:

1. Enable foreign key support for the database/branch in the PlanetScale dashboard (or via `pscale` CLI) *before* running migrations — check PlanetScale's current docs, this setting has moved around across their product versions.
2. Use the connection string format PlanetScale gives you, which typically needs `?sslaccept=strict` appended.
3. Run `npx prisma migrate deploy` (see step 3 below) and verify the foreign keys actually landed — `SHOW CREATE TABLE reviews;` should list `CONSTRAINT ... FOREIGN KEY`.

If you're not sure, Railway's MySQL plugin is the lower-risk choice for this project as-is.

---

## 2. Backend → Railway

1. **New Project → Deploy from GitHub repo**, select this repo.
2. **Settings → Root Directory**: set to `backend`. Railway builds/runs only that subfolder.
3. Railway auto-detects Node via Nixpacks. The scripts in `backend/package.json` already do the right thing for a PaaS deploy:
   - `postinstall: prisma generate` — runs automatically after `npm install`, so the Prisma Client is always generated fresh on deploy (no manual step).
   - `start: prisma migrate deploy && node dist/server.js` — runs pending migrations against the production DB, then starts the server. `migrate deploy` (not `migrate dev`) is non-interactive and safe for CI/CD — it never prompts, never resets data.
   - Build command Railway will run: `npm run build` (compiles TS to `dist/`).
4. **Variables** (Settings → Variables) — set every one of these; the app fails fast at boot via `config/env.ts` if any required one is missing:

   | Variable | Value |
   |---|---|
   | `NODE_ENV` | `production` |
   | `DATABASE_URL` | from step 1 |
   | `CLIENT_URL` | your Vercel URL, e.g. `https://techpulse.vercel.app` (**no trailing slash**) |
   | `JWT_ACCESS_SECRET` | generated in step 0 |
   | `JWT_REFRESH_SECRET` | generated in step 0 (different from access) |
   | `JWT_ACCESS_EXPIRES_IN` | `15m` |
   | `JWT_REFRESH_EXPIRES_IN` | `7d` |
   | `BCRYPT_SALT_ROUNDS` | `12` |
   | `CLOUDINARY_CLOUD_NAME` | from Cloudinary dashboard |
   | `CLOUDINARY_API_KEY` | from Cloudinary dashboard |
   | `CLOUDINARY_API_SECRET` | from Cloudinary dashboard |

   `PORT` — do **not** set this manually. Railway injects its own `PORT` and the app already reads `process.env.PORT` via `env.ts`; hardcoding it can break routing.

5. Deploy. Check the build log for `prisma migrate deploy` output — first deploy should show all migrations applying (`add_review_vote_counts`, `add_refresh_tokens`, etc.).
6. Note the public URL Railway gives the service (Settings → Networking → **Generate Domain** if it's not already public) — you'll need it for the frontend's env vars.

### Why `NODE_ENV=production` matters here specifically

Two behaviors in the code are gated on it, both required for this exact topology to work:

- **`app.ts`**: `trust proxy` is only set in production. Railway sits behind a reverse proxy, so without this, `req.ip` would always resolve to Railway's proxy IP — the rate limiters in `middlewares/rateLimiter.ts` would then bucket *every* user under one IP, effectively rate-limiting the whole app as a single client instead of per real visitor.
- **`authController.ts`**: the refresh cookie switches to `sameSite: "none"` + `secure: true` in production. Vercel and Railway are different domains (cross-site, not just cross-port like `localhost:3000`/`localhost:4000` in dev) — `sameSite: "strict"` would silently stop the browser from ever sending the refresh cookie back, breaking login persistence and silent refresh entirely. `SameSite=None` requires `Secure`, which requires HTTPS — both Vercel and Railway serve HTTPS by default, so this is satisfied automatically.

If you later move both apps under one root domain (e.g. `app.techpulse.com` + `api.techpulse.com`), you *can* tighten `sameSite` back to `"lax"` for better CSRF protection, since same-site cookies would work again — that's a deliberate follow-up, not something this guide does for you.

---

## 3. Frontend → Vercel

1. **Add New → Project**, import the same GitHub repo.
2. **Root Directory**: set to `frontend`. Vercel auto-detects Next.js and fills in build/output settings — no changes needed there.
3. **Environment Variables**:

   | Variable | Value |
   |---|---|
   | `NEXT_PUBLIC_API_URL` | `https://<your-railway-domain>/api/v1` |
   | `NEXT_PUBLIC_SOCKET_URL` | `https://<your-railway-domain>` (no `/api/v1` — Socket.IO attaches to the raw server, see `backend/src/sockets/index.ts`) |

   Both are `NEXT_PUBLIC_` on purpose (read client-side by `lib/axios.ts` and `providers/SocketProvider.tsx`) — they're not secrets, just the backend's public URL.
4. Deploy. Once live, copy the resulting `https://<project>.vercel.app` URL.
5. Go back to Railway and set `CLIENT_URL` to this exact URL (step 2.4) if you hadn't already — then redeploy the backend so CORS picks it up (`app.ts`'s `cors({ origin: env.CLIENT_URL, credentials: true })` only allows this one exact origin, not a wildcard).

---

## 4. Post-deploy smoke test

In this order (later steps depend on earlier ones actually working):

1. `GET https://<railway-domain>/api/v1/health` → `{"success":true,...}`.
2. Open the Vercel URL, register a new account. Check the browser's Application/Storage tab → Cookies for the Railway domain: `refreshToken` should be present, `HttpOnly`, `Secure`, `SameSite=None`.
3. Refresh the page — you should stay logged in (confirms the cross-site cookie + rotation flow from `authService.refresh` actually works over HTTPS between the two real domains, not just in local dev).
4. Open the same product in two browser tabs (or two browsers), post a comment in one — confirm it appears live in the other (Socket.IO connecting cross-origin correctly).
5. Upload an avatar from the profile page — confirms `CLOUDINARY_*` vars are correct and the backend can reach Cloudinary from Railway's network.
6. Check Railway's logs for the `[socket]` connection lines and any `[UNHANDLED ERROR]` output — the latter would mean an unexpected 500 is happening somewhere; investigate before considering the deploy done.

---

## 5. Common issues

| Symptom | Likely cause |
|---|---|
| Login works but a page refresh logs you out | `CLIENT_URL` on Railway doesn't exactly match the Vercel URL (protocol/trailing slash/domain typo) — CORS silently blocks the cookie-bearing request, or `sameSite`/`secure` mismatch because `NODE_ENV` isn't actually `production`. |
| 429 errors immediately for every user | `trust proxy` not taking effect — double check `NODE_ENV=production` is set on Railway, not just in a local `.env` that doesn't get deployed. |
| `prisma migrate deploy` fails on first deploy | `DATABASE_URL` malformed, or (PlanetScale) foreign keys not enabled before the FK-heavy migrations run. |
| Avatar upload returns 500 with a Cloudinary message | Wrong `CLOUDINARY_CLOUD_NAME` — it's the short handle shown next to "API Keys" in the Cloudinary dashboard (e.g. `do6ginmax`), not a key's display name. |
| Socket connects but comments/notifications never arrive live | `NEXT_PUBLIC_SOCKET_URL` pointing at the wrong host, or still has a `/api/v1` suffix (Socket.IO does not live under that path). |
