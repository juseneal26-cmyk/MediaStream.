import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { catalogApi } from '../api/catalog';

export default function TitleDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [title, setTitle] = useState(null);
  const [availability, setAvailability] = useState([]);
  const [error, setError] = useState(null);

  useEffect(() => {
    setTitle(null);
    setError(null);
    Promise.all([catalogApi.getTitle(id), catalogApi.getAvailability(id)])
      .then(([t, avail]) => {
        setTitle(t);
        setAvailability(avail);
      })
      .catch((err) => setError(err.response?.data?.message || 'No se pudo cargar el título.'));
  }, [id]);

  if (error) return <div className="page form-error">{error}</div>;
  if (!title) return <div className="page">Cargando…</div>;

  const firstEpisode = title.seasons?.[0]?.episodes?.[0];

  return (
    <div className="page title-detail">
      <h1>{title.name}</h1>
      <p className="title-detail-meta">
        {title.category} · {title.ageRating} · {title.type === 'SERIES' ? 'Serie' : 'Película'}
      </p>
      <p className="title-detail-synopsis">{title.synopsis}</p>

      {title.type === 'MOVIE' ? (
        <button className="btn-primary" onClick={() => navigate(`/reproducir/${title.id}`)}>
          ▶ Reproducir
        </button>
      ) : (
        <div className="episode-list">
          <h2>Temporadas</h2>
          {title.seasons.map((season) => (
            <div key={season.id} className="season-block">
              <h3>Temporada {season.seasonNumber}</h3>
              <ul>
                {season.episodes.map((ep) => (
                  <li key={ep.id}>
                    <span>
                      Episodio {ep.episodeNumber} — {Math.round(ep.durationSeconds / 60)} min
                    </span>
                    <button
                      className="btn-primary btn-small"
                      onClick={() =>
                        navigate(`/reproducir/${title.id}?episodeId=${ep.id}&duration=${ep.durationSeconds}`)
                      }
                    >
                      ▶ Reproducir
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          ))}
          {!firstEpisode && <p>Todavía no hay episodios cargados.</p>}
        </div>
      )}

      <h2>Disponibilidad regional</h2>
      <ul className="availability-list">
        {availability.map((a) => (
          <li key={a.id} className={a.isAvailableNow ? 'available' : 'unavailable'}>
            {a.region} — {a.isAvailableNow ? 'disponible ahora' : 'sin licencia vigente'}
          </li>
        ))}
        {availability.length === 0 && <li>Sin información de disponibilidad.</li>}
      </ul>
    </div>
  );
}
