# PeekOops

A real-time multiplayer drawing-deduction party game. Everyone draws the
same secret word — except one imposter, who gets a similar-but-different
word. Drawings are revealed one quadrant at a time; after each reveal,
players discuss and can call a unanimous vote to accuse someone.

- `server/` — Node + Express + Socket.io backend (in-memory room state,
  server-authoritative phase timers).
- `client/` — React + Vite frontend.

## Local development

**Terminal 1 — server**
```bash
cd server
npm install
npm run dev
```

**Terminal 2 — client**
```bash
cd client
npm install
npm run dev
```

The client defaults to `http://localhost:3001` for the server connection
and the server defaults to allowing `http://localhost:5173` — both are
overridable via env vars (`VITE_SERVER_URL` and `CLIENT_URL`). Open the
printed Vite URL, open a couple more browser tabs (or use your phone on
the same network with your machine's LAN IP), and get 3 players into a
room to start a round.

## Deployment

See [DEPLOY.md](./DEPLOY.md) for exact steps to get a public link live
on Vercel (frontend) + Render (backend).
