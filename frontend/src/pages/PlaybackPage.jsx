import { useEffect, useRef, useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { playbackApi } from '../api/playback';
import { useAuth } from '../context/AuthContext';

const DEFAULT_REGION = 'CO';
const PROGRESS_INTERVAL_SECONDS = 5;

export default function PlaybackPage() {
  const { titleId } = useParams();
  const [searchParams] = useSearchParams();
  const episodeId = searchParams.get('episodeId') || undefined;
  const knownDuration = Number(searchParams.get('duration')) || null;
  const navigate = useNavigate();
  const { activeProfile } = useAuth();

  const [session, setSession] = useState(null);
  const [error, setError] = useState(null);
  const [playing, setPlaying] = useState(false);
  const [position, setPosition] = useState(0);
  const positionRef = useRef(0);

  useEffect(() => {
    if (!activeProfile) return;
    setError(null);
    playbackApi
      .getToken(titleId, { profileId: activeProfile.id, region: DEFAULT_REGION, deviceId: 'web-browser' })
      .then((data) => {
        setSession(data);
        setPlaying(true);
      })
      .catch((err) =>
        setError(err.response?.data?.message || 'No se pudo generar el token de reproducción.'),
      );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [titleId, activeProfile]);

  // Simula el avance de reproducción y reporta progreso periódicamente
  // (POST /api/playback/progress), igual que haría un reproductor real.
  useEffect(() => {
    if (!playing || !session) return;
    const tick = setInterval(() => {
      positionRef.current += 1;
      setPosition(positionRef.current);
    }, 1000);
    return () => clearInterval(tick);
  }, [playing, session]);

  useEffect(() => {
    if (!session || position === 0 || position % PROGRESS_INTERVAL_SECONDS !== 0) return;
    playbackApi
      .saveProgress({
        profileId: activeProfile.id,
        titleId,
        episodeId,
        positionSeconds: position,
        durationSeconds: knownDuration || undefined,
        deviceId: 'web-browser',
      })
      .catch(() => {
        /* no crítico para la demo: playback.progress tolera perder un mensaje ocasional */
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [position, session]);

  function finish() {
    setPlaying(false);
    playbackApi
      .saveProgress({
        profileId: activeProfile.id,
        titleId,
        episodeId,
        positionSeconds: knownDuration || position,
        durationSeconds: knownDuration || undefined,
        deviceId: 'web-browser',
      })
      .finally(() => navigate(`/titulos/${titleId}`));
  }

  if (error) {
    return (
      <div className="page form-error">
        {error}
        <div>
          <button className="btn-ghost" onClick={() => navigate(-1)}>
            Volver
          </button>
        </div>
      </div>
    );
  }

  if (!session) return <div className="page">Solicitando token DRM…</div>;

  const pct = knownDuration ? Math.min(100, (position / knownDuration) * 100) : null;

  return (
    <div className="page player-page">
      <h1>{session.titleName}</h1>
      <div className="player-screen">
        <span className="player-icon">{playing ? '▶' : '⏸'}</span>
        <p className="player-hint">Reproducción simulada — sesión {session.sessionId.slice(0, 8)}</p>
      </div>

      <div className="player-progress">
        <div className="player-progress-bar">
          <div className="player-progress-fill" style={{ width: `${pct ?? 0}%` }} />
        </div>
        <span>
          {formatTime(position)}
          {knownDuration ? ` / ${formatTime(knownDuration)}` : ''}
        </span>
      </div>

      <div className="player-controls">
        <button className="btn-primary" onClick={() => setPlaying((p) => !p)}>
          {playing ? 'Pausar' : 'Reanudar'}
        </button>
        <button className="btn-ghost" onClick={finish}>
          Terminar
        </button>
      </div>

      <p className="player-meta">
        Token expira en {session.expiresInSeconds}s · manifiesto: {session.manifestUrl}
      </p>
    </div>
  );
}

function formatTime(totalSeconds) {
  const m = Math.floor(totalSeconds / 60);
  const s = Math.floor(totalSeconds % 60);
  return `${m}:${s.toString().padStart(2, '0')}`;
}
