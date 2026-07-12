// A stable identity for THIS browser tab, independent of socket.id (which
// changes every time the socket reconnects). This is what lets a player
// keep their seat — their role, score, and place in the round — across a
// dropped connection instead of silently becoming a new, disconnected
// "ghost" player.
//
// sessionStorage (not localStorage) is used deliberately: it's scoped per
// tab, so opening several tabs to test multiple players locally still gives
// each tab its own identity.

const CLIENT_ID_KEY = 'peekoops:clientId';
const SESSION_KEY = 'peekoops:session';

function makeId() {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) return crypto.randomUUID();
  return `id-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

export function getClientId() {
  try {
    let id = sessionStorage.getItem(CLIENT_ID_KEY);
    if (!id) {
      id = makeId();
      sessionStorage.setItem(CLIENT_ID_KEY, id);
    }
    return id;
  } catch {
    // sessionStorage unavailable (e.g. private mode edge cases) — fall back
    // to an in-memory id for this page's lifetime.
    return makeId();
  }
}

export function saveSession(roomCode, playerId) {
  try {
    sessionStorage.setItem(SESSION_KEY, JSON.stringify({ roomCode, playerId }));
  } catch {
    /* ignore */
  }
}

export function loadSession() {
  try {
    const raw = sessionStorage.getItem(SESSION_KEY);
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
    sessionStorage.removeItem(SESSION_KEY);
  } catch {
    /* ignore */
  }
}
