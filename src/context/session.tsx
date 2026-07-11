import { createContext, useContext, useState, useCallback, type ReactNode } from 'react';

// App-wide session state that used to live in the web App.tsx:
// login status + the set of saved cafe ids. Screens read/update it via useSession().
interface SessionState {
  isLoggedIn: boolean;
  login: () => void;
  logout: () => void;
  savedIds: Set<string>;
  toggleSave: (id: string) => void;
  isSaved: (id: string) => boolean;
}

const SessionContext = createContext<SessionState | null>(null);

export function SessionProvider({ children }: { children: ReactNode }) {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  // Web seeded savedIds with "1" — keep parity.
  const [savedIds, setSavedIds] = useState<Set<string>>(() => new Set(['1']));

  const login = useCallback(() => setIsLoggedIn(true), []);
  const logout = useCallback(() => setIsLoggedIn(false), []);

  const toggleSave = useCallback((id: string) => {
    setSavedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const isSaved = useCallback((id: string) => savedIds.has(id), [savedIds]);

  return (
    <SessionContext.Provider value={{ isLoggedIn, login, logout, savedIds, toggleSave, isSaved }}>
      {children}
    </SessionContext.Provider>
  );
}

export function useSession() {
  const ctx = useContext(SessionContext);
  if (!ctx) throw new Error('useSession must be used within a SessionProvider');
  return ctx;
}
