// A stable identity for THIS browser, independent of socket.id (which
// changes every time the socket reconnects). This is what lets a player
// keep their seat — their role, score, and place in the round — across a
// dropped connection instead of silently becoming a new, disconnected
// "ghost" player.
//
// localStorage is used deliberately: it survives not just a socket
// reconnect but a full page reload, tab close, or the tab being killed and
// reopened (e.g. mobile backgrounding, laptop sleep, Render's free-tier
// server spinning down and back up) — all of which would wipe
// sessionStorage and hand the player a brand-new identity right when
// reconnection support matters most.
//
// Trade-off: because it's per-browser rather than per-tab, opening several
// tabs in the *same* browser to test multiple players locally will now have
// them share one identity. Use separate browsers/profiles (or an incognito
// window) for that kind of local multi-player testing.

const CLIENT_ID_KEY = 'peekoops:clientId';
const SESSION_KEY = 'peekoops:session';

function makeId() {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) return crypto.randomUUID();
  return `id-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

export function getClientId() {
  try {
    let id = localStorage.getItem(CLIENT_ID_KEY);
    if (!id) {
      id = makeId();
      localStorage.setItem(CLIENT_ID_KEY, id);
    }
    return id;
  } catch {
    // localStorage unavailable (e.g. private mode edge cases) — fall back
    // to an in-memory id for this page's lifetime.
    return makeId();
  }
}

export function saveSession(roomCode, playerId) {
  try {
    localStorage.setItem(SESSION_KEY, JSON.stringify({ roomCode, playerId }));
  } catch {
    /* ignore */
  }
}

export function loadSession() {
  try {
    const raw = localStorage.getItem(SESSION_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed?.roomCode || !parsed?.playerId) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function clearSession() {
  try {
    localStorage.removeItem(SESSION_KEY);
  } catch {
    /* ignore */
  }
}
