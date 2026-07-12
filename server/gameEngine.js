import { randomWordPair } from './wordPairs.js';

// ---- broadcast helpers -----------------------------------------------

function toRoom(io, room) {
  return io.to(room.code);
}

export function broadcastPlayers(io, room) {
  toRoom(io, room).emit('playersUpdate', {
    players: room.publicPlayers(),
    hostId: room.hostId,
  });
}

export function broadcastSettings(io, room) {
  toRoom(io, room).emit('settingsUpdate', { settings: room.settings });
}

// ---- round lifecycle ---------------------------------------------------

export function startRound(io, room) {
  room.clearTimer();
  const players = room.connectedPlayers;
  const [crewWord, imposterWord] = randomWordPair();
  const imposter = players[Math.floor(Math.random() * players.length)];

  room.roundNumber += 1;
  room.round = {
    word: crewWord,
    imposterWord,
    imposterId: imposter.id,
    playerIds: players.map((p) => p.id), // who actually played this round — used for fair scoring even if someone disconnects/reconnects later
    quadrant: 0,
    strokes: new Map(), // playerId -> [stroke]
    ready: new Set(),
    votes: new Map(), // voterId -> votedId
    chat: [],
    drawEndsAt: Date.now() + room.settings.drawTime * 1000,
  };
  room.phase = 'draw';

  for (const p of players) {
    room.round.strokes.set(p.id, []);
    const isImposter = p.id === imposter.id;
    io.to(p.socketId).emit('roundStart', {
      roundNumber: room.roundNumber,
      isImposter,
      word: isImposter ? imposterWord : crewWord,
      drawEndsAt: room.round.drawEndsAt,
      drawTime: room.settings.drawTime,
    });
  }

  room.timerHandle = setTimeout(() => {
    advanceToQuadrant(io, room, 1);
  }, room.settings.drawTime * 1000);
}

export function advanceToQuadrant(io, room, n) {
  room.clearTimer();
  const round = room.round;
  round.quadrant = n;
  round.ready = new Set();

  const strokesByPlayer = {};
  for (const [pid, strokes] of round.strokes.entries()) {
    strokesByPlayer[pid] = strokes;
  }

  round.discussEndsAt = Date.now() + room.settings.discussTime * 1000;
  room.phase = 'discuss';

  toRoom(io, room).emit('quadrantReveal', {
    quadrant: n,
    strokesByPlayer,
    discussEndsAt: round.discussEndsAt,
    discussTime: room.settings.discussTime,
  });

  room.timerHandle = setTimeout(() => {
    onDiscussEnd(io, room);
  }, room.settings.discussTime * 1000);
}

function onDiscussEnd(io, room) {
  const round = room.round;
  if (round.quadrant < 4) {
    // No unanimous call in time — move straight to the next quadrant.
    advanceToQuadrant(io, room, round.quadrant + 1);
  } else {
    // Last quadrant — a vote is forced even with no unanimous call.
    startVote(io, room);
  }
}

export function toggleReady(io, room, playerId, ready) {
  if (room.phase !== 'discuss' || !room.round) return;
  const round = room.round;
  if (ready) round.ready.add(playerId);
  else round.ready.delete(playerId);

  const total = room.connectedPlayers.length;
  toRoom(io, room).emit('readyUpdate', {
    readyCount: round.ready.size,
    total,
    readyIds: [...round.ready],
  });

  if (round.ready.size >= total && total > 0) {
    // Unanimous call to vote — cut the discuss window short.
    room.clearTimer();
    startVote(io, room);
  }
}

function startVote(io, room) {
  room.clearTimer();
  const round = room.round;
  round.votes = new Map();
  round.voteEndsAt = Date.now() + room.settings.voteTime * 1000;
  room.phase = 'vote';

  toRoom(io, room).emit('voteStart', {
    voteEndsAt: round.voteEndsAt,
    voteTime: room.settings.voteTime,
  });

  room.timerHandle = setTimeout(() => {
    onVoteEnd(io, room);
  }, room.settings.voteTime * 1000);
}

export function submitVote(io, room, voterId, votedId) {
  if (room.phase !== 'vote' || !room.round) return;
  room.round.votes.set(voterId, votedId);
  const total = room.connectedPlayers.length;
  toRoom(io, room).emit('voteUpdate', {
    votedCount: room.round.votes.size,
    total,
  });

  // Everyone's in — no need to wait out the clock.
  if (total > 0 && room.round.votes.size >= total) {
    room.clearTimer();
    onVoteEnd(io, room);
  }
}

function tallyVotes(round) {
  const counts = new Map();
  for (const votedId of round.votes.values()) {
    counts.set(votedId, (counts.get(votedId) || 0) + 1);
  }
  let topId = null;
  let topCount = -1;
  let tie = false;
  for (const [id, count] of counts.entries()) {
    if (count > topCount) {
      topCount = count;
      topId = id;
      tie = false;
    } else if (count === topCount) {
      tie = true;
    }
  }
  if (tie || topId === null) return null;
  return topId;
}

const VOTE_REVEAL_PAUSE_MS = 3500;

function onVoteEnd(io, room) {
  room.clearTimer();
  const round = room.round;
  const accusedId = tallyVotes(round);
  const accused = accusedId ? room.players.get(accusedId) : null;
  const caught = accusedId !== null && accusedId === round.imposterId;
  const isLastQuadrant = round.quadrant >= 4;

  room.phase = 'voteResult';

  const voteResultPayload = {
    accusedId: accusedId || null,
    accusedName: accused ? accused.name : null,
    accusedColorKey: accused ? accused.colorKey : null,
    wasImposter: caught,
    noMajority: accusedId === null,
    quadrant: round.quadrant,
    isLastQuadrant,
  };
  round.lastVoteResult = voteResultPayload;

  toRoom(io, room).emit('voteResult', voteResultPayload);

  // Give everyone a beat to see the reveal (Among Us style) before moving on.
  room.timerHandle = setTimeout(() => {
    if (caught) {
      endRound(io, room, 'caught', accusedId);
    } else if (!isLastQuadrant) {
      advanceToQuadrant(io, room, round.quadrant + 1);
    } else {
      endRound(io, room, 'escaped', accusedId);
    }
  }, VOTE_REVEAL_PAUSE_MS);
}

// Points are awarded by team, never per-vote: everyone on the winning team
// gets the same number of points, and only one team wins per round.
//   - Crew wins (imposter caught): every crewmate who played this round
//     gets CREW_WIN_POINTS each, the imposter gets nothing.
//   - Imposter wins (escapes all 4 quadrants without being caught): the
//     imposter alone gets IMPOSTER_WIN_POINTS, crewmates get nothing.
const CREW_WIN_POINTS = 1;
const IMPOSTER_WIN_POINTS = 2;

function endRound(io, room, outcome, accusedId) {
  const round = room.round;
  room.phase = 'results';

  const imposter = room.players.get(round.imposterId);
  const roundPlayerIds = round.playerIds || [...room.players.keys()];

  if (outcome === 'caught') {
    // Crew wins — every crewmate who played this round gets an equal share.
    for (const id of roundPlayerIds) {
      if (id === round.imposterId) continue;
      const p = room.players.get(id);
      if (p) p.score += CREW_WIN_POINTS;
    }
  } else {
    // Imposter wins — got away clean.
    if (imposter) imposter.score += IMPOSTER_WIN_POINTS;
  }

  const payload = {
    outcome, // 'caught' | 'escaped'
    imposterId: round.imposterId,
    imposterName: imposter ? imposter.name : 'Unknown',
    accusedId: accusedId || null,
    word: round.word,
    imposterWord: round.imposterWord,
    quadrant: round.quadrant,
    players: room.publicPlayers(),
  };
  round.lastResults = payload; // kept for players who reconnect during the results screen

  toRoom(io, room).emit('results', payload);
}

export function addStrokeChunk(room, playerId, chunk) {
  if (room.phase !== 'draw' || !room.round) return;
  const strokes = room.round.strokes.get(playerId);
  if (!strokes) return;

  if (chunk.newStroke) {
    strokes.push({
      id: chunk.strokeId,
      color: chunk.color,
      width: chunk.width,
      points: [...chunk.points],
    });
  } else {
    const stroke = strokes.find((s) => s.id === chunk.strokeId);
    if (stroke) stroke.points.push(...chunk.points);
    else strokes.push({ id: chunk.strokeId, color: chunk.color, width: chunk.width, points: [...chunk.points] });
  }
}

export function addChatMessage(io, room, player, text) {
  if (!room.round) return;
  const trimmed = String(text || '').slice(0, 280).trim();
  if (!trimmed) return;
  const msg = { playerId: player.id, name: player.name, colorKey: player.colorKey, text: trimmed, ts: Date.now() };
  room.round.chat.push(msg);
  toRoom(io, room).emit('chatMessage', msg);
}

export function roomSnapshot(room, playerId) {
  const snap = {
    code: room.code,
    hostId: room.hostId,
    players: room.publicPlayers(),
    settings: room.settings,
    phase: room.phase,
    roundNumber: room.roundNumber,
  };
  if (room.round && room.phase !== 'lobby') {
    const round = room.round;
    const total = room.connectedPlayers.length;
    snap.round = {
      quadrant: round.quadrant,
      strokesByPlayer: Object.fromEntries(round.strokes.entries()),
      drawEndsAt: round.drawEndsAt,
      discussEndsAt: round.discussEndsAt,
      voteEndsAt: round.voteEndsAt,
      chat: round.chat,
      readyInfo: { readyCount: round.ready?.size || 0, total, readyIds: [...(round.ready || [])] },
      voteInfo: { votedCount: round.votes?.size || 0, total },
      myVote: playerId ? round.votes?.get(playerId) ?? null : null,
      myReady: playerId ? round.ready?.has(playerId) || false : false,
    };
    if (room.phase === 'voteResult' && round.lastVoteResult) {
      snap.voteResult = round.lastVoteResult;
    }
    if (room.phase === 'results' && round.lastResults) {
      snap.results = round.lastResults;
    }
    if (playerId) {
      const isImposter = playerId === round.imposterId;
      snap.you = { isImposter, word: isImposter ? round.imposterWord : round.word };
    }
  }
  return snap;
}
