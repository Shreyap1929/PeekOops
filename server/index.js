import express from 'express';
import http from 'http';
import cors from 'cors';
import { Server } from 'socket.io';

import { Room, SETTINGS_LIMITS } from './room.js';
import { generateRoomCode } from './roomCode.js';
import {
  startRound,
  toggleReady,
  submitVote,
  addStrokeChunk,
  broadcastPlayers,
  broadcastSettings,
  roomSnapshot,
} from './gameEngine.js';

const PORT = process.env.PORT || 3001;
const CLIENT_URL = process.env.CLIENT_URL || 'http://localhost:5173';

const app = express();
app.use(cors({ origin: CLIENT_URL }));
app.get('/', (_req, res) => res.send('PeekOops server is running.'));
app.get('/health', (_req, res) => res.json({ ok: true }));

const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: CLIENT_URL, methods: ['GET', 'POST'] },
});

/** @type {Map<string, Room>} */
const rooms = new Map();
/** socketId -> { roomCode, playerId } — playerId is a STABLE id owned by the
 * client (persisted across reconnects), never the transient socket.id. */
const socketIndex = new Map();

function clampSettings(input = {}) {
  const out = {};
  for (const key of Object.keys(SETTINGS_LIMITS)) {
    const { min, max } = SETTINGS_LIMITS[key];
    const raw = Number(input[key]);
    if (Number.isFinite(raw)) out[key] = Math.min(max, Math.max(min, Math.round(raw)));
  }
  return out;
}

/** Turns a client-supplied clientId into a safe, stable player id string.
 * Falls back to the socket id if the client didn't send one (older clients). */
function resolveClientId(raw, fallback) {
  const cleaned = String(raw || '').trim().slice(0, 64);
  return cleaned || fallback;
}

/** Looks up the {room, player} for the socket making the request, based on
 * the stable playerId recorded in socketIndex — NOT socket.id. */
function currentPlayer(socket) {
  const idx = socketIndex.get(socket.id);
  if (!idx) return { room: null, player: null, playerId: null };
  const room = rooms.get(idx.roomCode);
  const player = room?.players.get(idx.playerId) || null;
  return { room, player, playerId: idx.playerId };
}

io.on('connection', (socket) => {
  socket.on('createRoom', ({ name, clientId }, cb) => {
    try {
      const cleanName = String(name || '').trim().slice(0, 20) || 'Player';
      const code = generateRoomCode(new Set(rooms.keys()));
      const playerId = resolveClientId(clientId, socket.id);
      const room = new Room(code, playerId);
      room.addPlayer(playerId, cleanName, socket.id);
      rooms.set(code, room);

      socket.join(code);
      socketIndex.set(socket.id, { roomCode: code, playerId });

      cb?.({ ok: true, roomCode: code, playerId, ...roomSnapshot(room, playerId) });
    } catch (err) {
      cb?.({ ok: false, error: 'Could not create room.' });
    }
  });

  socket.on('joinRoom', ({ roomCode, name, clientId }, cb) => {
    const code = String(roomCode || '').trim().toUpperCase();
    const room = rooms.get(code);
    if (!room) {
      cb?.({ ok: false, error: 'Room not found. Check the code and try again.' });
      return;
    }
    const playerId = resolveClientId(clientId, socket.id);

    // If this exact player (same persisted id) is already seated in the
    // room — e.g. a page refresh mid-game — treat this as a resume instead
    // of a brand-new join, regardless of the current phase.
    const existing = room.players.get(playerId);
    if (existing) {
      existing.socketId = socket.id;
      existing.connected = true;
      socket.join(code);
      socketIndex.set(socket.id, { roomCode: code, playerId });
      cb?.({ ok: true, roomCode: code, playerId, ...roomSnapshot(room, playerId) });
      broadcastPlayers(io, room);
      return;
    }

    if (room.phase !== 'lobby') {
      cb?.({ ok: false, error: 'This round has already started. Ask the host for the next one.' });
      return;
    }
    const cleanName = String(name || '').trim().slice(0, 20) || 'Player';
    room.addPlayer(playerId, cleanName, socket.id);

    socket.join(code);
    socketIndex.set(socket.id, { roomCode: code, playerId });

    cb?.({ ok: true, roomCode: code, playerId, ...roomSnapshot(room, playerId) });
    broadcastPlayers(io, room);
  });

  // Fired by the client whenever its socket re-establishes a connection
  // (flaky wifi, brief server hiccup, tab coming back from sleep, etc.) and
  // it already believes it's mid-game. Re-attaches the new socket to the
  // existing player record and returns a full state snapshot so the client
  // can resync instead of getting stuck on whatever screen it froze on.
  socket.on('rejoinRoom', ({ roomCode, playerId }, cb) => {
    const code = String(roomCode || '').trim().toUpperCase();
    const room = rooms.get(code);
    if (!room) {
      cb?.({ ok: false, error: 'Room not found.' });
      return;
    }
    const id = String(playerId || '');
    const player = room.players.get(id);
    if (!player) {
      cb?.({ ok: false, error: 'Could not find your seat in this room.' });
      return;
    }

    player.socketId = socket.id;
    player.connected = true;
    socket.join(code);
    socketIndex.set(socket.id, { roomCode: code, playerId: id });

    cb?.({ ok: true, roomCode: code, playerId: id, ...roomSnapshot(room, id) });
    broadcastPlayers(io, room);
  });

  socket.on('requestState', ({ roomCode }, cb) => {
    const room = rooms.get(String(roomCode || '').toUpperCase());
    const idx = socketIndex.get(socket.id);
    if (!room) {
      cb?.({ ok: false, error: 'Room not found.' });
      return;
    }
    cb?.({ ok: true, ...roomSnapshot(room, idx?.playerId) });
  });

  socket.on('updateSettings', ({ roomCode, settings }) => {
    const { room, playerId } = currentPlayer(socket);
    if (!room || room.code !== String(roomCode || '').toUpperCase()) return;
    if (!playerId || room.hostId !== playerId || room.phase !== 'lobby') return;
    room.settings = { ...room.settings, ...clampSettings(settings) };
    broadcastSettings(io, room);
  });

  socket.on('startGame', ({ roomCode }) => {
    const { room, playerId } = currentPlayer(socket);
    if (!room || room.code !== String(roomCode || '').toUpperCase()) return;
    if (!playerId || room.hostId !== playerId || room.phase !== 'lobby') return;
    if (room.connectedPlayers.length < 3) return;
    startRound(io, room);
  });

  socket.on('nextRound', ({ roomCode }) => {
    const { room, playerId } = currentPlayer(socket);
    if (!room || room.code !== String(roomCode || '').toUpperCase()) return;
    if (!playerId || room.hostId !== playerId || room.phase !== 'results') return;
    if (room.connectedPlayers.length < 3) return;
    startRound(io, room);
  });

  socket.on('strokeChunk', ({ roomCode, ...chunk }) => {
    const { room, playerId } = currentPlayer(socket);
    if (!room || room.code !== String(roomCode || '').toUpperCase() || !playerId) return;
    addStrokeChunk(room, playerId, chunk);
  });

  socket.on('toggleReady', ({ roomCode, ready }) => {
    const { room, playerId } = currentPlayer(socket);
    if (!room || room.code !== String(roomCode || '').toUpperCase() || !playerId) return;
    toggleReady(io, room, playerId, !!ready);
  });

  socket.on('submitVote', ({ roomCode, votedId }) => {
    const { room, playerId } = currentPlayer(socket);
    if (!room || room.code !== String(roomCode || '').toUpperCase() || !playerId) return;
    submitVote(io, room, playerId, votedId);
  });

  socket.on('disconnect', () => {
    const idx = socketIndex.get(socket.id);
    socketIndex.delete(socket.id);
    if (!idx) return;
    const room = rooms.get(idx.roomCode);
    if (!room) return;

    const player = room.players.get(idx.playerId);
    if (!player) return;

    // A newer socket for the same player may have already taken over
    // (e.g. a rapid reconnect) — don't clobber that live connection.
    if (player.socketId !== socket.id) return;

    if (room.phase === 'lobby') {
      room.players.delete(idx.playerId);
    } else {
      player.connected = false;
    }

    if (room.hostId === idx.playerId) {
      const next = room.connectedPlayers[0];
      room.hostId = next ? next.id : room.hostId;
    }

    if (room.players.size === 0 || room.connectedPlayers.length === 0) {
      room.clearTimer();
      rooms.delete(room.code);
      return;
    }

    broadcastPlayers(io, room);
  });
});

server.listen(PORT, () => {
  console.log(`PeekOops server listening on port ${PORT}`);
  console.log(`Allowed client origin: ${CLIENT_URL}`);
});
