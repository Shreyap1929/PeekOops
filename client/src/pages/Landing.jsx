import { useState } from 'react';
import HowToPlayModal from '../components/HowToPlayModal.jsx';

export default function Landing({ onCreateRoom, onJoinRoom, errorMsg, busy }) {
  const [name, setName] = useState('');
  const [joinCode, setJoinCode] = useState('');
  const [mode, setMode] = useState(null); // null | 'join'
  const [showHowTo, setShowHowTo] = useState(false);

  const trimmedName = name.trim();
  const canCreate = trimmedName.length > 0 && !busy;
  const canJoin = trimmedName.length > 0 && joinCode.trim().length === 4 && !busy;

  return (
    <div className="app-shell" style={{ justifyContent: 'center' }}>
      <div className="wide center-screen">
        <div style={{ width: '100%', maxWidth: 460, margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: 'var(--space-6)' }}>
            <div style={{ fontSize: '3rem', marginBottom: 'var(--space-2)' }}>🕵️‍♀️✏️</div>
            <h1 style={{ fontSize: '2.6rem', color: 'var(--coral-shade)' }}>PeekOops</h1>
            <p style={{ color: 'var(--ink-soft)', fontWeight: 700, marginTop: 'var(--space-2)' }}>
              Draw the word. Spot the imposter.
            </p>
          </div>

          <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
            <div className="field">
              <label htmlFor="name">Your name</label>
              <input
                id="name"
                className="input"
                maxLength={20}
                placeholder="e.g. Alex"
                value={name}
                onChange={(e) => setName(e.target.value)}
                autoFocus
              />
            </div>

            {mode !== 'join' ? (
              <>
                <button className="btn btn-primary" disabled={!canCreate} onClick={() => onCreateRoom(trimmedName)}>
                  Create Room
                </button>
                <button className="btn btn-secondary" disabled={!trimmedName} onClick={() => setMode('join')}>
                  Join Room
                </button>
              </>
            ) : (
              <>
                <div className="field">
                  <label htmlFor="code">Room code</label>
                  <input
                    id="code"
                    className="input code-input"
                    maxLength={4}
                    placeholder="ABCD"
                    value={joinCode}
                    onChange={(e) => setJoinCode(e.target.value.toUpperCase().replace(/[^A-Z]/g, ''))}
                  />
                </div>
                <button className="btn btn-primary" disabled={!canJoin} onClick={() => onJoinRoom(trimmedName, joinCode.trim())}>
                  Join Room
                </button>
                <button className="btn btn-ghost" onClick={() => setMode(null)}>
                  ← Back
                </button>
              </>
            )}

            {errorMsg && (
              <div style={{ color: 'var(--coral-shade)', fontWeight: 700, fontSize: '0.9rem', textAlign: 'center' }}>
                {errorMsg}
              </div>
            )}
          </div>

          <div style={{ textAlign: 'center', marginTop: 'var(--space-5)' }}>
            <button className="btn btn-ghost" onClick={() => setShowHowTo(true)}>
              📖 How to Play
            </button>
          </div>
        </div>
      </div>

      {showHowTo && <HowToPlayModal onClose={() => setShowHowTo(false)} />}
    </div>
  );
}
