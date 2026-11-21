import { useEffect, useRef, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import AppShell from '../components/layout/AppShell';
import { Icon } from '../components/ui';
import { useQuiz } from '../context/QuizContext';
import { useLiveGame } from '../hooks/useLiveGame';
import Setup from '../components/live/Setup';
import Lobby from '../components/live/Lobby';
import LiveQuizScreen from '../components/live/LiveQuizScreen';
import Final from '../components/live/Final';
import '../styles/Dashboard.css';
import '../styles/Leaderboard.css';
import '../styles/Live.css';

const SUBTITLES = {
  lobby: 'Share the code. The game starts when the host is ready.',
  question: 'Answer before the clock runs out. Faster is worth more.',
  reveal: 'Here is how everyone did.',
  finished: 'Game over. Thanks for playing!',
};

// Live multiplayer: host or join a room, then play the same questions at the same time.
// The room code lives in the URL (?code=), so a refresh or an invite link lands in the game.
export default function Live() {
  const navigate = useNavigate();
  const { user } = useQuiz();
  const myId = String(user?._id || user?.id || '');
  const [params, setParams] = useSearchParams();
  const urlCode = (params.get('code') || '').toUpperCase();
  const game = useLiveGame();
  const { room, connection } = game;
  const [confirmLeave, setConfirmLeave] = useState(false);
  const [joinError, setJoinError] = useState('');
  // The room code from the URL that was already joined (or tried). Only a code we
  // haven't been in yet is joined automatically: otherwise leaving a room would put
  // us straight back in, for the moment the old ?code= is still in the address bar.
  const triedCode = useRef('');

  // Opened from an invite link or refreshed mid-game: join that room once connected
  useEffect(() => {
    if (connection !== 'online' || room || !urlCode || triedCode.current === urlCode) return;
    triedCode.current = urlCode;
    game.join(urlCode).then((res) => {
      if (!res?.ok) {
        setJoinError(res?.message || 'Could not join that game.');
        setParams({}, { replace: true });
      }
    });
  }, [connection, room, urlCode, game, setParams]);

  // Keep the address in step with the room we're in (created or joined from the form too)
  useEffect(() => {
    if (!room?.code) return;
    triedCode.current = room.code;
    if (urlCode !== room.code) setParams({ code: room.code }, { replace: true });
  }, [room?.code, urlCode, setParams]);

  // The room was closed under us (host left, or it expired)
  useEffect(() => {
    if (game.closed && urlCode) setParams({}, { replace: true });
  }, [game.closed, urlCode, setParams]);

  const leave = async () => {
    setConfirmLeave(false);
    // Never rejoin the room being left, and drop its code from the address first
    if (room?.code) triedCode.current = room.code;
    setParams({}, { replace: true });
    await game.leave();
  };

  // While the game is being played it fills the screen, like a solo quiz
  const playing = room && ['question', 'reveal', 'exam'].includes(room.status);

  // Leaving mid-game needs a confirm; the lobby and the final screen don't
  const askLeave = () => {
    if (playing) setConfirmLeave(true);
    else leave();
  };

  const offline = connection === 'offline';
  const notice = game.closed || joinError;

  const confirmBanner = confirmLeave && room && (
    <div className="lv-banner lv-confirm" role="alertdialog" aria-labelledby="lv-confirm-title">
      <div>
        <p id="lv-confirm-title" className="lv-confirm-title">
          {room.isHost ? 'End this game for everyone?' : 'Leave this game?'}
        </p>
        <p className="db-section-sub">
          {room.isHost
            ? 'Every player is sent back to the start and no results are saved.'
            : 'You can rejoin with the same code while the game is running.'}
        </p>
      </div>
      <div className="lv-confirm-actions">
        {/* Only shown while playing, so it uses the quiz screen's buttons */}
        <button className="qz-prev" onClick={() => setConfirmLeave(false)} autoFocus>Keep playing</button>
        <button className="qz-next lv-danger" onClick={leave}>{room.isHost ? 'End game' : 'Leave'}</button>
      </div>
    </div>
  );
  const offlineBanner = offline && (
    <div className={`lv-banner ${room ? 'is-warn' : ''}`} role="status">
      <span className="lv-pulse is-warn" aria-hidden="true" />
      {game.error || 'Connection lost. Reconnecting…'}
      {room && <span className="lv-muted"> Your place and score are kept.</span>}
    </div>
  );

  if (playing) {
    return (
      <LiveQuizScreen
          key={room.code}
          room={room}
          myId={myId}
          myName={user?.name}
          offline={offline}
          clockOffset={game.clockOffset}
          notices={(confirmBanner || offlineBanner) && <div className="lv-qz-notices">{confirmBanner}{offlineBanner}</div>}
          onAnswer={game.answer}
          onNext={game.next}
          onExamAnswer={game.examAnswer}
          onExamSubmit={game.examSubmit}
          onLeave={askLeave}
        />
    );
  }

  return (
    <AppShell title="Live game">
      <div className="pg-head">
        <div>
          <h1 className="pg-title">Live game</h1>
          <p className="db-section-sub">{room ? SUBTITLES[room.status] : 'Play a quiz with friends, everyone at the same time.'}</p>
        </div>
        {!room && (
          <button className="db-btn-ghost" onClick={() => navigate('/live/history')}>
            <Icon name="clock" size={15} /> Past games
          </button>
        )}
        {room && (
          <div className="pg-head-actions">
            <span className="lv-head-code" aria-label={`Game code ${room.code}`}>{room.code}</span>
            <button className="db-btn-ghost" onClick={askLeave}>
              <Icon name="logout" size={15} /> {room.isHost && room.status !== 'finished' ? 'End game' : 'Leave'}
            </button>
          </div>
        )}
      </div>

      {confirmBanner}
      {offlineBanner}
      {connection === 'connecting' && !room && (
        <div className="lv-banner" role="status"><span className="lv-pulse" aria-hidden="true" /> Connecting to the live server…</div>
      )}
      {!room && notice && (
        <div className="lv-banner is-info" role="status">
          {notice}
          <button className="lv-banner-close" onClick={() => { game.clearClosed(); setJoinError(''); }} aria-label="Dismiss">
            <Icon name="close" size={14} />
          </button>
        </div>
      )}

      {!room && (
        <Setup
          onCreate={game.create}
          onJoin={game.join}
          disabled={connection !== 'online'}
          initialCode={urlCode}
          initialQuizId={params.get('host') || ''}
        />
      )}
      {room?.status === 'lobby' && <Lobby room={room} myId={myId} onStart={game.start} offline={offline} />}
      {room?.status === 'finished' && (
        <Final room={room} myId={myId} onLeave={leave} onHistory={(id) => navigate(`/live/history/game?id=${id}`)} />
      )}

    </AppShell>
  );
}
