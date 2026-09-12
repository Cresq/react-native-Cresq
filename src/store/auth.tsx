import { createContext, useCallback, useContext, useMemo, useState, type PropsWithChildren } from "react";

type AuthState = { signedIn: boolean; signIn: () => void; signOut: () => void };

const AuthContext = createContext<AuthState>({ signedIn: false, signIn: () => {}, signOut: () => {} });

/** In-memory auth for v1. Replace with a real provider; the routing stays the same. */
export function AuthProvider({ children }: PropsWithChildren) {
  const [signedIn, setSignedIn] = useState(false);
  const signIn = useCallback(() => setSignedIn(true), []);
  const signOut = useCallback(() => setSignedIn(false), []);
  const value = useMemo(() => ({ signedIn, signIn, signOut }), [signedIn, signIn, signOut]);
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export const useAuth = () => useContext(AuthContext);
