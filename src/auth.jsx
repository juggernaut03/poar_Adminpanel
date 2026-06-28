import { createContext, useContext, useEffect, useState } from 'react';
import { api, tokenStore } from './api.js';

const AuthCtx = createContext(null);

export function AuthProvider({ children }) {
  const [admin, setAdmin] = useState(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (!tokenStore.get()) {
      setReady(true);
      return;
    }
    api
      .me()
      .then((res) => setAdmin(res.admin))
      .catch(() => tokenStore.clear())
      .finally(() => setReady(true));
  }, []);

  const login = async (email, password) => {
    const res = await api.login(email, password);
    tokenStore.set(res.token);
    setAdmin(res.admin);
    return res.admin;
  };

  const logout = () => {
    tokenStore.clear();
    setAdmin(null);
  };

  return <AuthCtx.Provider value={{ admin, ready, login, logout }}>{children}</AuthCtx.Provider>;
}

export const useAuth = () => useContext(AuthCtx);
