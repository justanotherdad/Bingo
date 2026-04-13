# Deployment guide (Vercel + Supabase + Hostinger)

This project is a **Next.js** app (UI + API routes) and a **Supabase** project (Postgres, Auth, optional Realtime). The app does not run on Hostinger’s PHP/shared hosting as a Node server unless you use a VPS with Node — the path below uses **Vercel for the app** and **Hostinger for DNS/domain** (or email), which is the usual setup.

## CSS-only vs Framer Motion (animations)

- **CSS animations** (what this repo uses for ball draws): keyframes + classes, no extra JS library, tiny bundle, easy to tweak. Best when motion is a short “pop” or fade.
- **Framer Motion**: better when you need choreographed sequences, drag, layout morphing, or spring physics across many elements. It adds a dependency and bundle size.

For bingo ball reveals, **CSS is enough**; you can add Framer Motion later without removing the CSS.

---

## 1. Prerequisites

- GitHub (or GitLab) repo with this code pushed.
- A **Supabase** project with migrations applied (`supabase/migrations/*.sql`).
- **Environment variables** documented in `.env.example`.

---

## 2. Supabase checklist

1. **Run SQL migrations** in Supabase → SQL Editor (or Supabase CLI), in order: `001`, `002`, `003`.
2. **Auth → URL configuration**
   - **Site URL**: your production URL (e.g. `https://bingo.yourdomain.com`).
   - **Redirect URLs**: add the same URL and `http://localhost:3000` for local dev.
3. **API keys** (Project Settings → API):
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY` (server-only; used by `/api/game/[gameId]/display` to validate the TV token — never commit it or expose it to the client).

4. **Promote an admin** (if you use `/admin`): run the SQL from `002` docs to set `user_roles.role = 'admin'` for your user.

---

## 3. Deploy on Vercel

1. Sign in at [vercel.com](https://vercel.com) (e.g. with GitHub).
2. **Add New → Project** → import your repository.
3. **Framework**: Next.js (auto).
4. **Environment variables** (Project → Settings → Environment Variables), for **Production** and **Preview** as needed:

   | Name | Notes |
   |------|--------|
   | `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL |
   | `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Anon/public key |
   | `SUPABASE_SERVICE_ROLE_KEY` | Service role (required for display API) |
   | `NEXT_PUBLIC_APP_URL` | Optional but recommended: `https://your-production-domain.tld` so “copy display link” on `/host` is a full URL |

5. **Deploy**. Vercel sets `VERCEL_URL` automatically; the host pages use it as a fallback if `NEXT_PUBLIC_APP_URL` is unset.

6. **Smoke test**
   - Open production `/login`, sign in.
   - `/host` → start a game → `/host/control` draw numbers.
   - Open the **display URL** on another device; you should see balls animate and hear sound after **Tap to enable sound**.

---

## 4. Custom domain on Vercel

1. Vercel → Project → **Settings → Domains** → add `bingo.yourdomain.com` (or apex).
2. Follow Vercel’s DNS instructions (usually **CNAME** to `cname.vercel-dns.com` for a subdomain).
3. Update **Supabase Auth** Site URL and Redirect URLs to the new domain.

---

## 5. Using Hostinger with this stack

Hostinger is often used for **the domain**, not for hosting this Next.js app on shared hosting.

### A. DNS only (recommended)

1. In **Hostinger → Domains → DNS / Nameservers**, point the domain or subdomain to Vercel:
   - Either use **Hostinger nameservers** and add the **CNAME/A** records Vercel shows, or
   - Change nameservers to Vercel if you move DNS fully to Vercel (optional).

2. Wait for DNS propagation (often minutes, sometimes up to 24–48 hours).

3. Add the same hostname in **Vercel → Domains** and wait until it verifies (SSL issued automatically).

### B. Hostinger VPS (only if you insist on not using Vercel)

You would install Node, run `npm ci`, `npm run build`, `npm run start` behind nginx, manage SSL, deploys, and env vars yourself. This is more operations work than Vercel for Next.js; it is not covered step-by-step here.

### C. Email on Hostinger

If your domain’s email stays on Hostinger, that does not conflict with the app living on Vercel. Keep **MX** records for mail; use **CNAME** for `www`/`app` subdomain to Vercel as required.

---

## 6. Security reminders

- Never put `SUPABASE_SERVICE_ROLE_KEY` in client-side code or `NEXT_PUBLIC_*` variables.
- The TV display is protected by **game id + `display_token`** in the URL (`?t=`). Treat links like secrets for the room.
- Rotate keys if they leak (Supabase dashboard).

---

## 7. Troubleshooting

| Issue | What to check |
|--------|----------------|
| Display API 500 | `SUPABASE_SERVICE_ROLE_KEY` missing in Vercel env; redeploy after adding. |
| Display 403 | Wrong `t` token or game id; use the exact link from `/host`. |
| No sound on TV | Browsers require a user gesture — use **Tap to enable sound** on the display page. |
| Relative display links on `/host` | Set `NEXT_PUBLIC_APP_URL` to your public `https://` origin. |


## 8. Deployments

```bash
cd "/Users/davefletes/Library/Mobile Documents/com~apple~CloudDocs/Buisness/DJ2/Applications/Bingo"
git add .
git commit -m "update"
git push -u origin main