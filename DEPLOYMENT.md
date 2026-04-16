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

### C. Hostinger app hosting: steps 3, 4, and 6 (same meaning as §3 Vercel)

In **§3 Deploy on Vercel** above, the *numbered steps inside that section* are:

| # | What it means on Vercel | What you do on Hostinger |
|---|-------------------------|---------------------------|
| **3** | Choose **Framework: Next.js** | In your Hostinger **Node / Web app** settings, choose a **Next.js** (or **Node.js**) deployment type and set **Node version** to **20** or newer if the panel asks. If you only upload a zip, the platform must still run `node` to start the server—follow Hostinger’s doc for “Next.js” or “Node” apps. |
| **4** | **Environment variables** | In hPanel open your app → **Environment variables** (or **Advanced** → **Environment**). Add **exactly** the same names as in the table below. Use your real **Hostinger site URL** for `NEXT_PUBLIC_APP_URL`, including **`https://`** (example: `https://yoursite.hostingersite.com`). After changing any `NEXT_PUBLIC_*` value, **rebuild** (`npm run build`) and redeploy—those are baked in at build time. |
| **6** | **Smoke test** (verify production) | Do this after every successful deploy: (1) Open `https://your-site/login`, sign in. (2) Go to `/host`, start a game, open `/host/control`, tap **Draw**. (3) Open the **display** URL on another device; confirm balls update and use **Enable sound** on the TV if needed. |

**Naming note:** This deploy **step 6** (smoke test) is **not** the same as **§6 Security reminders** later in this file—that section is about secrets and keys.

Same variable table as Vercel §3 step 4:

| Name | Notes |
|------|--------|
| `NEXT_PUBLIC_SUPABASE_URL` | `https://xxxx.supabase.co` |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Anon/public key |
| `SUPABASE_SERVICE_ROLE_KEY` | Service role (server-only) |
| `NEXT_PUBLIC_APP_URL` | `https://your-live-hostname` (full URL with `https://`) |

### D. “§4 Custom domain” on Hostinger (instead of Vercel)

This mirrors **§4 Custom domain on Vercel**, but DNS lives in Hostinger:

1. **Hostinger → Domains** (or **Websites** → your site → **Domains**): attach or point your custom domain to this hosting.
2. Turn on **SSL** (Let’s Encrypt or Hostinger’s free SSL) so the site loads **`https://`**
3. **Supabase → Authentication → URL configuration**
   - **Site URL** → `https://your-custom-domain.com` (must include `https://`)
   - **Redirect URLs** → add `https://your-custom-domain.com/**` and keep `http://localhost:3000/**` for dev
4. Update **`NEXT_PUBLIC_APP_URL`** to the same `https://` origin, rebuild, redeploy.

### E. Git push updates Hostinger (not Vercel) — you do **not** need Vercel in the middle

- **You do not need Vercel as an intermediary.** The app talks to **Supabase** over HTTPS from whatever host serves your Next.js app. Pick **either** Hostinger **or** Vercel (or another host) for production—not both unless you want two live URLs on purpose.
- If you move fully to Hostinger, you can **delete or pause** the Vercel project and **remove** the old Vercel URL from Supabase **Redirect URLs** when you no longer use it.

**Option 1 — Built-in Git on Hostinger (when your plan shows it)**

Exact clicks vary by hPanel version; look for **Git**, **Deployments**, or **Connect repository** on the website that runs this Node app.

1. Push your code to **GitHub** (or GitLab) on branch `main` (or `master`).
2. In **Hostinger hPanel**, open the **website / Node application** that should run this Bingo app.
3. Find **Deploy from Git** / **GIT** / **Connect Git** (wording varies). Connect your GitHub account and **authorize** the repo.
4. Configure:
   - **Repository** → your Bingo repo  
   - **Branch** → `main`  
   - **Install command** → `npm ci` (or `npm install`)  
   - **Build command** → `npm run build`  
   - **Start command** → `npm run start` (or `npx next start -p $PORT` if the panel injects `PORT`)  
5. Add the **same environment variables** as in the table in §5.C above (Hostinger’s env UI).
6. Enable **automatic deploy on push** if the panel offers it (deploy on every push to `main`).
7. Save and trigger the **first deploy**. Fix build errors in the **Build logs** if any.
8. Run the **smoke test** (§3 step **6** / §5.C table): `/login` → `/host` → `/host/control` → display URL.

**Git deploy vs manual ZIP (why 503 can appear only after connecting Git)**  
A ZIP upload is often a **pre-built** `.next` folder from your PC. A Git deploy runs **`npm install` / `npm ci` and `npm run build` on Hostinger’s servers** — a clean Linux environment with **no local `.env` file** (only the variables you set in the panel). That can surface issues that ZIP hid:

- **Build fails or is skipped** → check **Build logs** (not only Runtime). Fix any red errors; a bad build can still leave the old site broken or return 503.
- **Wrong branch** → confirm the connected branch is **`main`** and actually contains `package.json` / `package-lock.json`.
- **Node version** → the runner must use **Node 20+** (this repo declares it in `package.json` → `engines`). Set Node 20 in the Hostinger app settings if there is a selector.
- **Monorepo** → if the app isn’t at the repo root, set **Root directory** / **Base directory** to the folder that contains `package.json`.
- **`npm ci` requires `package-lock.json`** in the repo; commit the lockfile or change install command to `npm install`.

**If you only see “Manually uploaded” (no “Deploy from Git”)**

Your screenshot matches a Node.js app that was created by **uploading a ZIP**. Git is not always shown on that summary screen; try in order:

1. **Deployments → “Settings and redeploy”** (gear) on the Node.js web app. Look for **Deployment source**, **Repository**, or **Connect Git** / **Import Git repository** / **Switch to Git**. If Hostinger lets you change the source, connect GitHub here and pick branch `main`.
2. **Websites → Advanced** (sidebar) or **Dashboard** for the same site — some plans put **Git** only under Advanced.
3. **Add a new Node.js Web App** (don’t delete the old one until the new deploy works): during **creation**, Hostinger often shows **Import Git repository** *before* you ever upload a ZIP. If you skipped that and chose upload, the app may stay “manual only” unless settings allow switching.
4. **Plan limits:** Managed Node + Git from GitHub is documented for Hostinger’s **Web Apps / Node** product line; cheaper or legacy plans may be **ZIP-only**. Check **Hosting plan** in the sidebar or upgrade page — or ask Hostinger support: *“Enable Git deployment for my Node.js web app.”*
5. If Git never appears, use **Option 2** (GitHub Actions + SSH/FTP) or stay on **manual ZIP** after each local `npm run build`.

Official references (wording changes over time): Hostinger help *“How to add a Node.js Web App”* and *“How to deploy a Git repository in Hostinger”* — search their support site for those titles.

If your Hostinger product **only** allows **ZIP upload** and has **no Git** option, you cannot get “git push = auto deploy” on that product alone. Use **Option 2** (below) or upgrade to a plan with Git/Node deployments.

**Option 2 — GitHub Actions (push → build → upload/SSH)**

Use this when Hostinger gives you **SSH** or **FTP** but no Git button.

**Where “Hostinger info” goes in GitHub (there is no single Hostinger field)**  
Unlike **Vercel**, GitHub does not ship a Hostinger button. The **Deployments** / **About** link to `*.vercel.app` comes from the **Vercel GitHub App** integration; it is separate from Hostinger.

1. **Secrets (passwords / keys only)**  
   - Open your repo → **Settings** (top bar).  
   - Left sidebar → **Secrets and variables** → **Actions**.  
   - **New repository secret**: add names like `HOSTINGER_SSH_KEY`, `HOSTINGER_HOST`, `HOSTINGER_USER`, or FTP `HOSTINGER_FTP_USER` / `HOSTINGER_FTP_PASSWORD` — use names you will reference in YAML.  
   - These stay encrypted; they do **nothing** until a workflow uses them.

2. **Workflow (the script that runs on each push)**  
   - Add a file in the repo: `.github/workflows/deploy.yml` (create the folders if missing).  
   - That YAML should: trigger on `push` to `main`, run `npm ci` and `npm run build`, then deploy (e.g. `rsync` over SSH using the secrets from step 1).  
   - After you commit this file, the **Actions** tab will show each run.

3. **Supabase / app env vars**  
   - Still set `NEXT_PUBLIC_*` and `SUPABASE_*` in **Hostinger’s** environment (or in GitHub **Secrets** only if you inject them at build time in the workflow — avoid duplicating unless you know why).

If you use **Option 1** (Hostinger connects to GitHub from **hPanel**), you **do not** need GitHub Actions secrets for Hostinger—authorization happens in Hostinger’s UI when you “Connect repository.”

### F. Email on Hostinger

If your domain’s email stays on Hostinger, that does not conflict with the app living on **Vercel** or **Hostinger**. Keep **MX** records for mail; point **A/CNAME** for your web hostname to whichever host serves the Next.js app.

---

## 6. Security reminders

(This is **not** “step 6” inside §3 Deploy — that step is the **smoke test**; see §5.C.)

- Never put `SUPABASE_SERVICE_ROLE_KEY` in client-side code or `NEXT_PUBLIC_*` variables.
- The TV display is protected by **game id + `display_token`** in the URL (`?t=`). Treat links like secrets for the room.
- Rotate keys if they leak (Supabase dashboard).

---

## 7. Troubleshooting

| Issue | What to check |
|--------|----------------|
| Display API 500 | `SUPABASE_SERVICE_ROLE_KEY` missing in host env (Vercel/Hostinger); redeploy after adding. |
| Display 403 | Wrong `t` token or game id; use the exact link from `/host`. |
| No sound on TV | Browsers require a user gesture — use **Tap to enable sound** on the display page. |
| Relative display links on `/host` | Set `NEXT_PUBLIC_APP_URL` to your public `https://` origin. |
| **503** on Hostinger / blank site | **(1)** In Supabase → **Project Settings → API**, confirm `NEXT_PUBLIC_SUPABASE_ANON_KEY` is the **`anon` `public`** key and `SUPABASE_SERVICE_ROLE_KEY` is the **`service_role` `secret`** key (they are never the same string). **(2)** **Start command** must be `npm run start` (or `npx next start …`), not a static file server. **(3)** If the panel has **Output directory** set to `.next`, try **clearing it** or using the default for **Node** apps (Hostinger expects `next start` to serve the built app; treating `.next` as static output is wrong). **(4)** Open **Runtime logs** for crash/OOM. **(5)** Set **Node 20+** if the panel asks. **(6)** If the platform assigns a port, set env **`PORT`** to that value or match it in reverse-proxy settings. **(7)** If this started **after connecting Git**: read **Build logs** (fresh CI build), confirm **branch** / **root directory** / committed **`package-lock.json`**, and see **Git deploy vs ZIP** in §5.E. |


## 8. Deployments

```bash
cd "/Users/davefletes/Library/Mobile Documents/com~apple~CloudDocs/Buisness/DJ2/Applications/Bingo"
git add .
git commit -m "fixes"
git push -u origin main