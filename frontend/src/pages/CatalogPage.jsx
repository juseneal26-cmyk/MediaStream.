import { useEffect, useState } from 'react';
import { catalogApi } from '../api/catalog';
import { useAuth } from '../context/AuthContext';
import TitleCard from '../components/TitleCard';

const REGIONS = ['GLOBAL', 'CO', 'MX', 'US'];

export default function CatalogPage() {
  const { activeProfile } = useAuth();
  const [titles, setTitles] = useState([]);
  const [region, setRegion] = useState('CO');
  const [category, setCategory] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    const params = { region };
    if (category) params.category = category;
    if (activeProfile?.isKids) params.isKids = 'true';

    catalogApi
      .listTitles(params)
      .then((data) => {
        if (!cancelled) setTitles(Array.isArray(data) ? data : data.items || []);
      })
      .catch((err) => {
        if (!cancelled) setError(err.response?.data?.message || 'No se pudo cargar el catálogo.');
      })
      .finally(() => !cancelled && setLoading(false));

    return () => {
      cancelled = true;
    };
  }, [region, category, activeProfile]);

  const categories = [...new Set(titles.map((t) => t.category))];

  return (
    <div className="page catalog-page">
      <div className="catalog-header">
        <h1>Catálogo</h1>
        <div className="catalog-filters">
          <select value={region} onChange={(e) => setRegion(e.target.value)}>
            {REGIONS.map((r) => (
              <option key={r} value={r}>
                {r}
              </option>
            ))}
          </select>
          <select value={category} onChange={(e) => setCategory(e.target.value)}>
            <option value="">Todas las categorías</option>
            {categories.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </div>
      </div>

      {activeProfile?.isKids && (
        <p className="kids-notice">Mostrando solo contenido apto para el perfil infantil.</p>
      )}

      {loading && <p>Cargando catálogo…</p>}
      {error && <div className="form-error">{error}</div>}

      <div className="title-grid">
        {titles.map((t) => (
          <TitleCard key={t.id} title={t} />
        ))}
        {!loading && titles.length === 0 && !error && (
          <p>No hay títulos disponibles con estos filtros.</p>
        )}
      </div>
    </div>
  );
}
