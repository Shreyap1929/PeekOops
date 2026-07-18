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
    doneDrawing: new Set(), // playerIds who've clicked "Done Drawing" — one-way, never removed
    ready: new Set(),
    votes: new Map(), // voterId -> votedId
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
  // Never trust the client alone: reject self-votes and votes for a target
  // that isn't an actual player in the room, even though the UI already
  // prevents both.
  if (!votedId || votedId === voterId || !room.players.has(votedId)) return;

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

// Returns the accused player's id only if they won a genuine majority —
// strictly more than half of all votes cast — otherwise null.
//
// Using one strict-majority check (instead of the old "highest count wins
// unless the top two are exactly tied") correctly folds BOTH failure modes
// the game cares about into the same "no majority" result:
//   - an exact tie for the top spot (e.g. 2-2 of 4) can never clear 50%
//   - a 3+-way split where the leader only has a plurality (e.g. 2 of 5,
//     which is 40%) also can't clear 50%, even though nothing was
//     technically tied for first place
// So a single `topCount * 2 > totalCast` check is both necessary and
// sufficient — no separate tie-detection is needed.
function tallyVotes(round) {
  const counts = new Map();
  let totalCast = 0;
  for (const votedId of round.votes.values()) {
    counts.set(votedId, (counts.get(votedId) || 0) + 1);
    totalCast += 1;
  }
  if (totalCast === 0) return null; // nobody voted — no majority is possible

  let topId = null;
  let topCount = 0;
  for (const [id, count] of counts.entries()) {
    if (count > topCount) {
      topCount = count;
      topId = id;
    }
  }

  const hasMajority = topCount * 2 > totalCast;
  return hasMajority ? topId : null;
}

const VOTE_REVEAL_PAUSE_MS = 3500;

function onVoteEnd(io, room) {
  room.clearTimer();
  const round = room.round;
  const accusedId = tallyVotes(round);
  const accused = accusedId ? room.players.get(accusedId) : null;
  const isLastQuadrant = round.quadrant >= 4;

  // Always exactly one of these three — the vote never resolves to
  // anything else, so the client never has a case to silently skip.
  //   'caught'     — Case 1: the imposter won a majority
  //   'wrong'      — Case 2: a crewmate won a majority
  //   'noMajority' — Case 3: a tie, or nobody cleared 50%
  let outcome;
  if (accusedId === null) outcome = 'noMajority';
  else if (accusedId === round.imposterId) outcome = 'caught';
  else outcome = 'wrong';

  room.phase = 'voteResult';

  const voteResultPayload = {
    outcome,
    accusedId,
    accusedName: accused ? accused.name : null,
    accusedColorKey: accused ? accused.colorKey : null,
    quadrant: round.quadrant,
    isLastQuadrant,
  };
  round.lastVoteResult = voteResultPayload;

  toRoom(io, room).emit('voteResult', voteResultPayload);

  // Give everyone a beat to see the reveal (Among Us style) before moving on.
  room.timerHandle = setTimeout(() => {
    if (outcome === 'caught') {
      endRound(io, room, 'caught', accusedId);
    } else if (!isLastQuadrant) {
      // Wrong guess or no majority, but there's still another quadrant to
      // reveal — the round continues instead of ending here. No player is
      // removed from the room or the round in any of these cases.
      advanceToQuadrant(io, room, round.quadrant + 1);
    } else {
      // Final quadrant with no correct accusation — the imposter gets away.
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

// Marks a player as finished drawing. One-way: once set, a player can never
// be un-marked, and clicking again is a harmless no-op (guards against
// double-clicks or a client retrying the emit). This intentionally does
// NOT check whether everyone is done or advance the round in any way —
// auto-advancing on full completion is a separate feature, handled later.
export function markDoneDrawing(io, room, playerId) {
  if (room.phase !== 'draw' || !room.round) return;
  const round = room.round;
  if (!round.strokes.has(playerId)) return; // not a player in this round
  if (round.doneDrawing.has(playerId)) return; // already marked — ignore repeat clicks

  round.doneDrawing.add(playerId);
  toRoom(io, room).emit('doneDrawingUpdate', {
    doneIds: [...round.doneDrawing],
    total: room.connectedPlayers.length,
  });
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
      readyInfo: { readyCount: round.ready?.size || 0, total, readyIds: [...(round.ready || [])] },
      voteInfo: { votedCount: round.votes?.size || 0, total },
      doneDrawingInfo: { doneIds: [...(round.doneDrawing || [])], total },
      myVote: playerId ? round.votes?.get(playerId) ?? null : null,
      myReady: playerId ? round.ready?.has(playerId) || false : false,
      myDoneDrawing: playerId ? round.doneDrawing?.has(playerId) || false : false,
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
