import { useCallback, useEffect, useRef, useState } from 'react';
import { socket } from './socket.js';
import { DEFAULT_SETTINGS } from './data/settingsMeta.js';

import Landing from './pages/Landing.jsx';
import Lobby from './pages/Lobby.jsx';
import RoleReveal from './pages/RoleReveal.jsx';
import Draw from './pages/Draw.jsx';
import QuadrantPhase from './pages/QuadrantPhase.jsx';
import Results from './pages/Results.jsx';

export default function App() {
  const [screen, setScreen] = useState('landing'); // 'landing' | 'room'
  const [connected, setConnected] = useState(socket.connected);
  const [busy, setBusy] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

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

  const [quadrant, setQuadrant] = useState(0);
  const [strokesByPlayer, setStrokesByPlayer] = useState({});
  const [discussEndsAt, setDiscussEndsAt] = useState(null);
  const [readyInfo, setReadyInfo] = useState({ readyCount: 0, total: 0, readyIds: [] });
  const [voteEndsAt, setVoteEndsAt] = useState(null);
  const [voteInfo, setVoteInfo] = useState({ votedCount: 0, total: 0 });
  const [chat, setChat] = useState([]);
  const [results, setResults] = useState(null);

  const playersRef = useRef(players);
  playersRef.current = players;

  useEffect(() => {
    const onConnect = () => setConnected(true);
    const onDisconnect = () => setConnected(false);

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
      setQuadrant(0);
      setStrokesByPlayer({});
      setChat([]);
      setResults(null);
      setReadyInfo({ readyCount: 0, total: playersRef.current.length, readyIds: [] });
      setVoteInfo({ votedCount: 0, total: playersRef.current.length });
      setShowReveal(true);
    };

    const onQuadrantReveal = (payload) => {
      setPhase('discuss');
      setQuadrant(payload.quadrant);
      setStrokesByPlayer(payload.strokesByPlayer);
      setDiscussEndsAt(payload.discussEndsAt);
      setReadyInfo({ readyCount: 0, total: playersRef.current.length, readyIds: [] });
    };

    const onReadyUpdate = (payload) => setReadyInfo(payload);

    const onVoteStart = (payload) => {
      setPhase('vote');
      setVoteEndsAt(payload.voteEndsAt);
      setVoteInfo({ votedCount: 0, total: playersRef.current.length });
    };

    const onVoteUpdate = (payload) => setVoteInfo(payload);

    const onChatMessage = (msg) => setChat((c) => [...c, msg]);

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
    socket.on('voteStart', onVoteStart);
    socket.on('voteUpdate', onVoteUpdate);
    socket.on('chatMessage', onChatMessage);
    socket.on('results', onResults);
    socket.on('error', onServerError);

    return () => {
      socket.off('connect', onConnect);
      socket.off('disconnect', onDisconnect);
      socket.off('playersUpdate', onPlayersUpdate);
      socket.off('settingsUpdate', onSettingsUpdate);
      socket.off('roundStart', onRoundStart);
      socket.off('quadrantReveal', onQuadrantReveal);
      socket.off('readyUpdate', onReadyUpdate);
      socket.off('voteStart', onVoteStart);
      socket.off('voteUpdate', onVoteUpdate);
      socket.off('chatMessage', onChatMessage);
      socket.off('results', onResults);
      socket.off('error', onServerError);
    };
  }, []);

  const applyJoinSnapshot = useCallback((res) => {
    setRoomCode(res.roomCode);
    setPlayers(res.players);
    setHostId(res.hostId);
    setSettings(res.settings);
    setPhase(res.phase);
    setRoundNumber(res.roundNumber || 0);
    const myPlayer = res.players.find((p) => p.id === res.playerId);
    setMe({ id: res.playerId, name: myPlayer?.name, colorKey: myPlayer?.colorKey });
    setScreen('room');
  }, []);

  const createRoom = (name) => {
    setBusy(true);
    setErrorMsg('');
    socket.emit('createRoom', { name }, (res) => {
      setBusy(false);
      if (!res?.ok) {
        setErrorMsg(res?.error || 'Could not create a room. Try again.');
        return;
      }
      applyJoinSnapshot(res);
    });
  };

  const joinRoom = (name, code) => {
    setBusy(true);
    setErrorMsg('');
    socket.emit('joinRoom', { name, roomCode: code }, (res) => {
      setBusy(false);
      if (!res?.ok) {
        setErrorMsg(res?.error || 'Could not join that room.');
        return;
      }
      applyJoinSnapshot(res);
    });
  };

  const updateSettings = (next) => {
    setSettings(next);
    socket.emit('updateSettings', { roomCode, settings: next });
  };

  const startGame = () => socket.emit('startGame', { roomCode });
  const nextRound = () => socket.emit('nextRound', { roomCode });
  const sendStrokeChunk = (chunk) => socket.emit('strokeChunk', { roomCode, ...chunk });
  const toggleReady = (ready) => socket.emit('toggleReady', { roomCode, ready });
  const submitVote = (votedId) => socket.emit('submitVote', { roomCode, votedId });
  const sendChat = (text) => socket.emit('chatMessage', { roomCode, text });

  if (screen === 'landing') {
    return <Landing onCreateRoom={createRoom} onJoinRoom={joinRoom} errorMsg={errorMsg} busy={busy} />;
  }

  return (
    <>
      {!connected && (
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
          onStrokeChunk={sendStrokeChunk}
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
          chat={chat}
          onSendChat={sendChat}
          voteInfo={voteInfo}
          onSubmitVote={submitVote}
          me={me}
        />
      )}

      {phase === 'results' && <Results results={results} isHost={me?.id === hostId} onNextRound={nextRound} />}
    </>
  );
}
