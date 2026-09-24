import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function ProfilesPage() {
  const { profiles, selectProfile } = useAuth();
  const navigate = useNavigate();

  function choose(profile) {
    selectProfile(profile);
    navigate('/catalogo');
  }

  return (
    <div className="profiles-page">
      <h1>¿Quién ve ahora?</h1>
      <div className="profiles-grid">
        {profiles.map((p) => (
          <button key={p.id} className="profile-card" onClick={() => choose(p)}>
            <div className={`profile-avatar ${p.isKids ? 'kids' : ''}`}>{p.name[0]}</div>
            <span>{p.name}</span>
            {p.isKids && <span className="profile-kids-tag">Infantil</span>}
          </button>
        ))}
        {profiles.length === 0 && <p>No hay perfiles todavía.</p>}
      </div>
    </div>
  );
}
