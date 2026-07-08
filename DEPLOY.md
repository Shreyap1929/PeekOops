# Deploying PeekOops

Same codebase, two platforms: the frontend (static Vite build) goes to
**Vercel**, the backend (needs a persistent WebSocket connection) goes to
**Render**. Vercel's serverless functions can't hold a Socket.io
connection open, which is why the server can't also live on Vercel.

## 0. Push to GitHub

```bash
git init
git add .
git commit -m "PeekOops"
gh repo create peekoops --public --source=. --push
# or: create a repo on github.com and `git remote add origin <url> && git push -u origin main`
```

## 1. Backend → Render

1. Go to https://dashboard.render.com → **New +** → **Web Service**.
2. Connect your GitHub repo.
3. Configure:
   - **Root Directory**: `server`
   - **Runtime**: Node
   - **Build Command**: `npm install`
   - **Start Command**: `npm start`
   - **Instance Type**: Free is fine for a prototype.
4. Add an environment variable:
   - `CLIENT_URL` = the Vercel URL you'll get in step 2 (you can add a
     placeholder now and update it after step 2 — Render redeploys
     automatically when you save a new env var).
5. Deploy. Note the public URL Render gives you, e.g.
   `https://peekoops-server.onrender.com`.

**Note on the free tier:** it spins down after ~15 minutes of no
traffic. The first request after that takes 30–60 seconds to wake back
up — fine for a prototype, nothing to engineer around.

## 2. Frontend → Vercel

1. Go to https://vercel.com/new and import the same GitHub repo.
2. Configure:
   - **Root Directory**: `client`
   - **Framework Preset**: Vite (should be auto-detected)
   - **Build Command**: `npm run build` (default)
   - **Output Directory**: `dist` (default)
3. Add an environment variable:
   - `VITE_SERVER_URL` = the Render URL from step 1, e.g.
     `https://peekoops-server.onrender.com`
4. Deploy. Note the public URL Vercel gives you, e.g.
   `https://peekoops.vercel.app`.

## 3. Wire them together

Go back to the Render service → **Environment** → set `CLIENT_URL` to
your real Vercel URL (from step 2) if you used a placeholder → save
(triggers a redeploy).

## 4. Test it

Open the Vercel URL on your phone and on a desktop browser (or two
phones), get 3 players into one room, and play a round end-to-end.

## Out of scope

CI/CD pipelines, custom domains, database persistence, autoscaling, and
uptime monitoring are intentionally not set up here — this is a
prototype deployment, not production infrastructure.
