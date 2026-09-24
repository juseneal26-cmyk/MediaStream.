import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { usersApi } from '../api/users';
import { setAccessToken, setUnauthorizedHandler } from '../api/client';

const AuthContext = createContext(null);

// El AccessToken es un JWT firmado por User-Service; el Gateway ya valida su
// firma, así que el frontend solo necesita leer el payload (sub, email) para
// saber quién inició sesión — no hace falta ninguna librería extra para eso.
function decodeJwtPayload(token) {
  try {
    const base64 = token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/');
    return JSON.parse(atob(base64));
  } catch {
    return null;
  }
}

const PROFILE_STORAGE_KEY = 'mediastream.profileId';

export function AuthProvider({ children }) {
  const [account, setAccount] = useState(null); // { id, email, status }
  const [profiles, setProfiles] = useState([]);
  const [activeProfile, setActiveProfileState] = useState(null);
  const [ready, setReady] = useState(false); // terminó el intento de restaurar sesión

  const clearSession = useCallback(() => {
    setAccessToken(null);
    setAccount(null);
    setProfiles([]);
    setActiveProfileState(null);
    localStorage.removeItem(PROFILE_STORAGE_KEY);
  }, []);

  useEffect(() => {
    setUnauthorizedHandler(clearSession);
  }, [clearSession]);

  const loadProfiles = useCallback(async (accountId) => {
    const list = await usersApi.listProfiles(accountId);
    setProfiles(list);
    const storedId = localStorage.getItem(PROFILE_STORAGE_KEY);
    const stored = list.find((p) => p.id === storedId);
    setActiveProfileState(stored || list[0] || null);
    return list;
  }, []);

  const applySession = useCallback(
    async (accessToken, accountStatus) => {
      setAccessToken(accessToken);
      const payload = decodeJwtPayload(accessToken);
      if (!payload) return;
      const nextAccount = { id: payload.sub, email: payload.email, status: accountStatus };
      setAccount(nextAccount);
      await loadProfiles(payload.sub);
      return nextAccount;
    },
    [loadProfiles],
  );

  // Al montar la app: intenta recuperar la sesión con el RefreshToken
  // (cookie httpOnly) sin pedirle credenciales al usuario de nuevo.
  useEffect(() => {
    (async () => {
      try {
        const { accessToken } = await usersApi.refresh();
        await applySession(accessToken, undefined);
      } catch {
        // No había sesión previa (o expiró): se queda deslogueado, normal.
      } finally {
        setReady(true);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const login = useCallback(
    async (email, password) => {
      const { accessToken, accountStatus } = await usersApi.login({ email, password });
      return applySession(accessToken, accountStatus);
    },
    [applySession],
  );

  const register = useCallback(async (data) => {
    return usersApi.register(data);
  }, []);

  const logout = useCallback(() => {
    clearSession();
  }, [clearSession]);

  const selectProfile = useCallback((profile) => {
    setActiveProfileState(profile);
    localStorage.setItem(PROFILE_STORAGE_KEY, profile.id);
  }, []);

  const value = useMemo(
    () => ({
      account,
      profiles,
      activeProfile,
      ready,
      isAuthenticated: Boolean(account),
      login,
      register,
      logout,
      selectProfile,
      reloadProfiles: () => account && loadProfiles(account.id),
    }),
    [account, profiles, activeProfile, ready, login, register, logout, selectProfile, loadProfiles],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth debe usarse dentro de <AuthProvider>');
  return ctx;
}
