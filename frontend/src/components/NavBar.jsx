import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function NavBar() {
  const { account, activeProfile, profiles, isAuthenticated, logout } = useAuth();
  const navigate = useNavigate();

  if (!isAuthenticated) return null;

  const status = account?.status;
  const showBanner = status === 'MOROSA' || status === 'SUSPENDIDA';

  return (
    <>
      <header className="navbar">
        <div className="navbar-inner">
          <NavLink to="/" className="brand">
            MediaStream
          </NavLink>
          <nav className="nav-links">
            <NavLink to="/catalogo">Catálogo</NavLink>
            <NavLink to="/recomendaciones">Recomendaciones</NavLink>
            <NavLink to="/facturacion">Facturación</NavLink>
          </nav>
          <div className="nav-right">
            {profiles.length > 0 && (
              <button className="profile-pill" onClick={() => navigate('/perfiles')}>
                {activeProfile ? activeProfile.name : 'Elegir perfil'}
              </button>
            )}
            <span className="account-email">{account?.email}</span>
            <button className="btn-ghost" onClick={logout}>
              Salir
            </button>
          </div>
        </div>
      </header>
      {showBanner && (
        <div className={`status-banner status-${status.toLowerCase()}`}>
          {status === 'MOROSA' && (
            <span>
              Tu último pago fue rechazado. Actualiza tu método de pago en{' '}
              <NavLink to="/facturacion">Facturación</NavLink> antes de que se
              restrinja más el acceso.
            </span>
          )}
          {status === 'SUSPENDIDA' && (
            <span>
              Tu cuenta está suspendida por pagos pendientes. Regulariza tu
              suscripción en <NavLink to="/facturacion">Facturación</NavLink> para
              recuperar el acceso.
            </span>
          )}
        </div>
      )}
    </>
  );
}
