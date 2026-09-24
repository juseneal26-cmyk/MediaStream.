import { useEffect, useState } from 'react';
import { recommendationsApi } from '../api/recommendations';
import { catalogApi } from '../api/catalog';
import { useAuth } from '../context/AuthContext';
import TitleCard from '../components/TitleCard';

export default function RecommendationsPage() {
  const { activeProfile } = useAuth();
  const [items, setItems] = useState(null);
  const [strategy, setStrategy] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!activeProfile) return;
    setItems(null);
    setError(null);

    recommendationsApi
      .getForProfile(activeProfile.id)
      .then(async (data) => {
        setStrategy(data.strategy);
        // Recommendation-Service solo conoce titleId + puntaje; el nombre y
        // la sinopsis se piden a Catalog-Service, que es quien los posee.
        const enriched = await Promise.all(
          data.items.slice(0, 12).map(async (item) => {
            try {
              const title = await catalogApi.getTitle(item.titleId);
              return { ...title, score: item.score, reason: item.reason };
            } catch {
              return null;
            }
          }),
        );
        setItems(enriched.filter(Boolean));
      })
      .catch((err) => {
        setError(
          err.response?.data?.detail || err.response?.data?.message || 'No se pudieron cargar las recomendaciones.',
        );
      });
  }, [activeProfile]);

  return (
    <div className="page">
      <h1>Recomendado para {activeProfile?.name}</h1>
      {strategy === 'popular' && (
        <p className="kids-notice">
          Aún no tenemos suficiente historial de este perfil: te mostramos lo más popular.
        </p>
      )}
      {error && <div className="form-error">{error}</div>}
      {!items && !error && <p>Calculando recomendaciones…</p>}
      <div className="title-grid">
        {items?.map((t) => <TitleCard key={t.id} title={t} />)}
        {items?.length === 0 && <p>Todavía no hay recomendaciones para este perfil.</p>}
      </div>
    </div>
  );
}
