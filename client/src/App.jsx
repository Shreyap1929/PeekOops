import { useCallback, useEffect, useRef, useState } from 'react';
import { socket } from './socket.js';
import { DEFAULT_SETTINGS } from './data/settingsMeta.js';
import { getClientId, saveSession, loadSession, clearSession } from './session.js';

import Landing from './pages/Landing.jsx';
import Lobby from './pages/Lobby.jsx';
import RoleReveal from './pages/RoleReveal.jsx';
import Draw from './pages/Draw.jsx';
import QuadrantPhase from './pages/QuadrantPhase.jsx';
import VoteResult from './pages/VoteResult.jsx';
import Results from './pages/Results.jsx';

const clientId = getClientId();

// How long the socket has to be down before we bother the player with the
// "Reconnecting…" banner. Socket.io retries very fast on brief network
// blips, so without this the banner used to flash on and off repeatedly —
// which is what looked like "the same glitch happening two or three times".
const DISCONNECT_BANNER_DELAY_MS = 600;

export default function App() {
  const [screen, setScreen] = useState('landing'); // 'landing' | 'room'
  const [showBanner, setShowBanner] = useState(false);
  const [busy, setBusy] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [resyncing, setResyncing] = useState(false);

  const [roomCode, setRoomCode] = useState('');
  const [me, setMe] = useState(null);
  const [players, setPlayers] = useState([]);
  const [hostId, setHostId] = useState(null);
  const [settings, setSettings] = useState(DEFAULT_SETTINGS);
  const [phase, setPhase] = useState('lobby');
  const [roundNumber, setRoundNumber] = useState(0);

  const [showReveal, setShowReveal] = useState(false);
  const [roundYou, setRoundYou] = useState({ isImposter: false, word: '' });
  const [drawEndsAt, setDrawEndsAt] = useState(null);
  const [initialStrokes, setInitialStrokes] = useState([]);
  const [doneDrawingInfo, setDoneDrawingInfo] = useState({ doneIds: [], total: 0 });

  const [quadrant, setQuadrant] = useState(0);
  const [strokesByPlayer, setStrokesByPlayer] = useState({});
  const [discussEndsAt, setDiscussEndsAt] = useState(null);
  const [readyInfo, setReadyInfo] = useState({ readyCount: 0, total: 0, readyIds: [] });
  const [voteEndsAt, setVoteEndsAt] = useState(null);
  const [voteInfo, setVoteInfo] = useState({ votedCount: 0, total: 0 });
  const [voteResultInfo, setVoteResultInfo] = useState(null);
  const [results, setResults] = useState(null);

  // Seeded from a resync so QuadrantPhase can restore "you already called a
  // vote" / "you already voted for X" instead of quietly forgetting it.
  const [myReadySeed, setMyReadySeed] = useState(false);
  const [myVoteSeed, setMyVoteSeed] = useState(null);
  const [myDoneSeed, setMyDoneSeed] = useState(false);
  const [resyncToken, setResyncToken] = useState(0);

  const playersRef = useRef(players);
  playersRef.current = players;
  const roomCodeRef = useRef(roomCode);
  roomCodeRef.current = roomCode;
  const meRef = useRef(me);
  meRef.current = me;
  const screenRef = useRef(screen);
  screenRef.current = screen;

  const applySnapshot = useCallback((res, { isRejoin }) => {
    setRoomCode(res.roomCode);
    setPlayers(res.players);
    setHostId(res.hostId);
    setSettings(res.settings);
    setPhase(res.phase);
    setRoundNumber(res.roundNumber || 0);

    const myPlayer = res.players.find((p) => p.id === res.playerId);
    setMe({ id: res.playerId, name: myPlayer?.name, colorKey: myPlayer?.colorKey });

    if (isRejoin) {
      // We're resuming mid-game — never replay the role-reveal overlay, and
      // fill in everything the normal event stream would have built up.
      setShowReveal(false);
      if (res.you) setRoundYou(res.you);
      if (res.round) {
        setDrawEndsAt(res.round.drawEndsAt || null);
        setInitialStrokes(res.round.strokesByPlayer?.[res.playerId] || []);
        setQuadrant(res.round.quadrant || 0);
        setStrokesByPlayer(res.round.strokesByPlayer || {});
        setDiscussEndsAt(res.round.discussEndsAt || null);
        setVoteEndsAt(res.round.voteEndsAt || null);
        setReadyInfo(res.round.readyInfo || { readyCount: 0, total: res.players.length, readyIds: [] });
        setVoteInfo(res.round.voteInfo || { votedCount: 0, total: res.players.length });
        setDoneDrawingInfo(res.round.doneDrawingInfo || { doneIds: [], total: res.players.length });
        setMyReadySeed(!!res.round.myReady);
        setMyVoteSeed(res.round.myVote ?? null);
        setMyDoneSeed(!!res.round.myDoneDrawing);
        setResyncToken((t) => t + 1);
      }
      if (res.roundResult) setVoteResultInfo(res.roundResult);
      if (res.results) setResults(res.results);
    }

    saveSession(res.roomCode, res.playerId);
    setScreen('room');
  }, []);

  // Attempts to resume a previous session (either after a raw socket
  // reconnect, or after a full page reload if sessionStorage still has one).
  const attemptRejoin = useCallback(() => {
    const stored = loadSession();
    if (!stored) return;
    socket.emit('rejoinRoom', { roomCode: stored.roomCode, playerId: stored.playerId }, (res) => {
      setResyncing(false);
      if (!res?.ok) {
        // Room's gone or we're not in it (e.g. server restarted) — don't
        // keep retrying against a session that will never work again.
        clearSession();
        return;
      }
      applySnapshot(res, { isRejoin: true });
    });
  }, [applySnapshot]);

  useEffect(() => {
    let bannerTimer = null;

    const onConnect = () => {
      if (bannerTimer) clearTimeout(bannerTimer);
      setShowBanner(false);
      // Only relevant if we'd already joined a room before this connect
      // (i.e. this is a reconnect, not the very first page load).
      if (screenRef.current === 'room' && roomCodeRef.current && meRef.current?.id) {
        setResyncing(true);
        attemptRejoin();
      }
    };
    const onDisconnect = () => {
      bannerTimer = setTimeout(() => setShowBanner(true), DISCONNECT_BANNER_DELAY_MS);
    };

    const onPlayersUpdate = ({ players: p, hostId: h }) => {
      setPlayers(p);
      setHostId(h);
    };
    const onSettingsUpdate = ({ settings: s }) => setSettings(s);

    const onRoundStart = (payload) => {
      setPhase('draw');
      setRoundNumber(payload.roundNumber);
      setRoundYou({ isImposter: payload.isImposter, word: payload.word });
      setDrawEndsAt(payload.drawEndsAt);
      setInitialStrokes([]);
      setQuadrant(0);
      setStrokesByPlayer({});
      setResults(null);
      setReadyInfo({ readyCount: 0, total: playersRef.current.length, readyIds: [] });
      setVoteInfo({ votedCount: 0, total: playersRef.current.length });
      setDoneDrawingInfo({ doneIds: [], total: playersRef.current.length });
      setVoteResultInfo(null);
      setMyReadySeed(false);
      setMyVoteSeed(null);
      setMyDoneSeed(false);
      setResyncToken((t) => t + 1);
      setShowReveal(true);
    };

    const onQuadrantReveal = (payload) => {
      setPhase('discuss');
      setQuadrant(payload.quadrant);
      setStrokesByPlayer(payload.strokesByPlayer);
      setDiscussEndsAt(payload.discussEndsAt);
      setReadyInfo({ readyCount: 0, total: playersRef.current.length, readyIds: [] });
      setMyReadySeed(false);
      setMyVoteSeed(null);
      setResyncToken((t) => t + 1);
    };

    const onReadyUpdate = (payload) => setReadyInfo(payload);

    const onDoneDrawingUpdate = (payload) => setDoneDrawingInfo(payload);

    const onVoteStart = (payload) => {
      setPhase('vote');
      setVoteEndsAt(payload.voteEndsAt);
      setVoteInfo({ votedCount: 0, total: playersRef.current.length });
      setVoteResultInfo(null);
      setMyVoteSeed(null);
      setResyncToken((t) => t + 1);
    };

    const onVoteUpdate = (payload) => setVoteInfo(payload);

    const onRoundResult = (payload) => {
      setPhase('voteResult');
      setVoteResultInfo(payload);
    };

    const onResults = (payload) => {
      setPhase('results');
      setResults(payload);
    };

    const onServerError = (payload) => setErrorMsg(payload?.message || 'Something went wrong.');

    socket.on('connect', onConnect);
    socket.on('disconnect', onDisconnect);
    socket.on('playersUpdate', onPlayersUpdate);
    socket.on('settingsUpdate', onSettingsUpdate);
    socket.on('roundStart', onRoundStart);
    socket.on('quadrantReveal', onQuadrantReveal);
    socket.on('readyUpdate', onReadyUpdate);
    socket.on('doneDrawingUpdate', onDoneDrawingUpdate);
    socket.on('voteStart', onVoteStart);
    socket.on('voteUpdate', onVoteUpdate);
    socket.on('ROUND_RESULT', onRoundResult);
    socket.on('results', onResults);
    socket.on('error', onServerError);

    return () => {
      if (bannerTimer) clearTimeout(bannerTimer);
      socket.off('connect', onConnect);
      socket.off('disconnect', onDisconnect);
      socket.off('playersUpdate', onPlayersUpdate);
      socket.off('settingsUpdate', onSettingsUpdate);
      socket.off('roundStart', onRoundStart);
      socket.off('quadrantReveal', onQuadrantReveal);
      socket.off('readyUpdate', onReadyUpdate);
      socket.off('doneDrawingUpdate', onDoneDrawingUpdate);
      socket.off('voteStart', onVoteStart);
      socket.off('voteUpdate', onVoteUpdate);
      socket.off('ROUND_RESULT', onRoundResult);
      socket.off('results', onResults);
      socket.off('error', onServerError);
    };
  }, [attemptRejoin]);

  // On first mount, if the tab still has a session from before a page
  // reload, try to silently resume it instead of dropping back to Landing.
  useEffect(() => {
    if (socket.connected) attemptRejoin();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const createRoom = (name) => {
    setBusy(true);
    setErrorMsg('');
    socket.emit('createRoom', { name, clientId }, (res) => {
      setBusy(false);
      if (!res?.ok) {
        setErrorMsg(res?.error || 'Could not create a room. Try again.');
        return;
      }
      applySnapshot(res, { isRejoin: false });
    });
  };

  const joinRoom = (name, code) => {
    setBusy(true);
    setErrorMsg('');
    socket.emit('joinRoom', { name, roomCode: code, clientId }, (res) => {
      setBusy(false);
      if (!res?.ok) {
        setErrorMsg(res?.error || 'Could not join that room.');
        return;
      }
      applySnapshot(res, { isRejoin: false });
    });
  };

  const updateSettings = (next) => {
    setSettings(next);
    socket.emit('updateSettings', { roomCode, settings: next });
  };

  const startGame = () => socket.emit('startGame', { roomCode });
  const nextRound = () => socket.emit('nextRound', { roomCode });
  const sendStrokeChunk = (chunk) => socket.emit('strokeChunk', { roomCode, ...chunk });
  const sendDoneDrawing = () => socket.emit('markDoneDrawing', { roomCode });
  const toggleReady = (ready) => socket.emit('toggleReady', { roomCode, ready });
  const submitVote = (votedId) => socket.emit('submitVote', { roomCode, votedId });

  if (screen === 'landing') {
    return <Landing onCreateRoom={createRoom} onJoinRoom={joinRoom} errorMsg={errorMsg} busy={busy} />;
  }

  return (
    <>
      {(showBanner || resyncing) && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            background: '#E4402F',
            color: 'white',
            textAlign: 'center',
            fontWeight: 800,
            fontSize: '0.85rem',
            padding: '6px',
            zIndex: 100,
          }}
        >
          Reconnecting to the game server…
        </div>
      )}

      {phase === 'lobby' && (
        <Lobby
          roomCode={roomCode}
          players={players}
          hostId={hostId}
          me={me}
          settings={settings}
          onUpdateSettings={updateSettings}
          onStart={startGame}
        />
      )}

      {phase === 'draw' && showReveal && (
        <RoleReveal
          isImposter={roundYou.isImposter}
          word={roundYou.word}
          roundNumber={roundNumber}
          onDone={() => setShowReveal(false)}
        />
      )}

      {phase === 'draw' && !showReveal && (
        <Draw
          word={roundYou.word}
          isImposter={roundYou.isImposter}
          drawEndsAt={drawEndsAt}
          drawTime={settings.drawTime}
          myColorKey={me?.colorKey}
          roundNumber={roundNumber}
          initialStrokes={initialStrokes}
          onStrokeChunk={sendStrokeChunk}
          players={players}
          doneDrawingInfo={doneDrawingInfo}
          onDoneDrawing={sendDoneDrawing}
          initialDone={myDoneSeed}
          resyncToken={resyncToken}
        />
      )}

      {(phase === 'discuss' || phase === 'vote') && (
        <QuadrantPhase
          phase={phase}
          quadrant={quadrant}
          players={players}
          strokesByPlayer={strokesByPlayer}
          discussEndsAt={discussEndsAt}
          discussTime={settings.discussTime}
          voteEndsAt={voteEndsAt}
          voteTime={settings.voteTime}
          readyInfo={readyInfo}
          onToggleReady={toggleReady}
          voteInfo={voteInfo}
          onSubmitVote={submitVote}
          me={me}
          initialReady={myReadySeed}
          initialVote={myVoteSeed}
          resyncToken={resyncToken}
        />
      )}

      {phase === 'voteResult' && <VoteResult result={voteResultInfo} />}

      {phase === 'results' && <Results results={results} isHost={me?.id === hostId} onNextRound={nextRound} />}
    </>
  );
}
