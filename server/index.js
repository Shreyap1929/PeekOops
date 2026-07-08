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
  addChatMessage,
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
/** socketId -> { roomCode, playerId } */
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

io.on('connection', (socket) => {
  socket.on('createRoom', ({ name }, cb) => {
    try {
      const cleanName = String(name || '').trim().slice(0, 20) || 'Player';
      const code = generateRoomCode(new Set(rooms.keys()));
      const playerId = socket.id;
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

  socket.on('joinRoom', ({ roomCode, name }, cb) => {
    const code = String(roomCode || '').trim().toUpperCase();
    const room = rooms.get(code);
    if (!room) {
      cb?.({ ok: false, error: 'Room not found. Check the code and try again.' });
      return;
    }
    if (room.phase !== 'lobby') {
      cb?.({ ok: false, error: 'This round has already started. Ask the host for the next one.' });
      return;
    }
    const cleanName = String(name || '').trim().slice(0, 20) || 'Player';
    const playerId = socket.id;
    room.addPlayer(playerId, cleanName, socket.id);

    socket.join(code);
    socketIndex.set(socket.id, { roomCode: code, playerId });

    cb?.({ ok: true, roomCode: code, playerId, ...roomSnapshot(room, playerId) });
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
    const room = rooms.get(String(roomCode || '').toUpperCase());
    if (!room || room.hostId !== socket.id || room.phase !== 'lobby') return;
    room.settings = { ...room.settings, ...clampSettings(settings) };
    broadcastSettings(io, room);
  });

  socket.on('startGame', ({ roomCode }) => {
    const room = rooms.get(String(roomCode || '').toUpperCase());
    if (!room || room.hostId !== socket.id || room.phase !== 'lobby') return;
    if (room.connectedPlayers.length < 3) return;
    startRound(io, room);
  });

  socket.on('nextRound', ({ roomCode }) => {
    const room = rooms.get(String(roomCode || '').toUpperCase());
    if (!room || room.hostId !== socket.id || room.phase !== 'results') return;
    if (room.connectedPlayers.length < 3) return;
    startRound(io, room);
  });

  socket.on('strokeChunk', ({ roomCode, ...chunk }) => {
    const room = rooms.get(String(roomCode || '').toUpperCase());
    if (!room) return;
    addStrokeChunk(room, socket.id, chunk);
  });

  socket.on('toggleReady', ({ roomCode, ready }) => {
    const room = rooms.get(String(roomCode || '').toUpperCase());
    if (!room) return;
    toggleReady(io, room, socket.id, !!ready);
  });

  socket.on('submitVote', ({ roomCode, votedId }) => {
    const room = rooms.get(String(roomCode || '').toUpperCase());
    if (!room) return;
    submitVote(io, room, socket.id, votedId);
  });

  socket.on('chatMessage', ({ roomCode, text }) => {
    const room = rooms.get(String(roomCode || '').toUpperCase());
    const player = room?.players.get(socket.id);
    if (!room || !player) return;
    addChatMessage(io, room, player, text);
  });

  socket.on('disconnect', () => {
    const idx = socketIndex.get(socket.id);
    socketIndex.delete(socket.id);
    if (!idx) return;
    const room = rooms.get(idx.roomCode);
    if (!room) return;

    const player = room.players.get(idx.playerId);
    if (!player) return;

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
