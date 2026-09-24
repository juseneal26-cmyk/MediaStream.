import { Navigate, Route, Routes } from 'react-router-dom';
import NavBar from './components/NavBar';
import ProtectedRoute from './components/ProtectedRoute';
import { useAuth } from './context/AuthContext';

import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import ProfilesPage from './pages/ProfilesPage';
import CatalogPage from './pages/CatalogPage';
import TitleDetailPage from './pages/TitleDetailPage';
import PlaybackPage from './pages/PlaybackPage';
import RecommendationsPage from './pages/RecommendationsPage';
import BillingPage from './pages/BillingPage';

export default function App() {
  const { ready, isAuthenticated } = useAuth();

  return (
    <div className="app-shell">
      <NavBar />
      <main>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/registro" element={<RegisterPage />} />
          <Route
            path="/"
            element={
              !ready ? (
                <div className="page-loading">Cargando…</div>
              ) : (
                <Navigate to={isAuthenticated ? '/catalogo' : '/login'} replace />
              )
            }
          />
          <Route
            path="/perfiles"
            element={
              <ProtectedRoute>
                <ProfilesPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/catalogo"
            element={
              <ProtectedRoute>
                <CatalogPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/titulos/:id"
            element={
              <ProtectedRoute>
                <TitleDetailPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/reproducir/:titleId"
            element={
              <ProtectedRoute>
                <PlaybackPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/recomendaciones"
            element={
              <ProtectedRoute>
                <RecommendationsPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/facturacion"
            element={
              <ProtectedRoute>
                <BillingPage />
              </ProtectedRoute>
            }
          />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>
    </div>
  );
}
