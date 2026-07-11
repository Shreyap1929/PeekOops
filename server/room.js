import { colorForIndex } from './colors.js';

export const DEFAULT_SETTINGS = {
  drawTime: 90,     // seconds, range 30-180
  discussTime: 30,  // seconds, range 15-60
  voteTime: 20,     // seconds, range 10-30
};

export const SETTINGS_LIMITS = {
  drawTime: { min: 30, max: 180 },
  discussTime: { min: 15, max: 60 },
  voteTime: { min: 10, max: 30 },
};

export class Room {
  constructor(code, hostId) {
    this.code = code;
    this.hostId = hostId;
    this.players = new Map(); // id -> { id, name, colorKey, score, connected, socketId }
    this.settings = { ...DEFAULT_SETTINGS };
    this.phase = 'lobby'; // lobby | draw | discuss | vote | voteResult | results
    this.roundNumber = 0;
    this.round = null;
    this.timerHandle = null;
  }

  get connectedPlayers() {
    return [...this.players.values()].filter((p) => p.connected);
  }

  addPlayer(id, name, socketId) {
    const colorKey = colorForIndex(this.players.size);
    const player = { id, name, colorKey, score: 0, connected: true, socketId };
    this.players.set(id, player);
    return player;
  }

  publicPlayers() {
    return [...this.players.values()].map((p) => ({
      id: p.id,
      name: p.name,
      colorKey: p.colorKey,
      score: p.score,
      connected: p.connected,
    }));
  }

  clearTimer() {
    if (this.timerHandle) {
      clearTimeout(this.timerHandle);
      this.timerHandle = null;
    }
  }
}
