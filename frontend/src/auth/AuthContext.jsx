/* eslint-disable react-refresh/only-export-components */
import {
  createContext,
  startTransition,
  useContext,
  useEffect,
  useState,
} from "react";
import api, {
  setApiAccessTokenGetter,
  setApiUnauthorizedHandler,
} from "../utils/api.js";

const STORAGE_KEY = "wayveda-auth-session";

const AuthContext = createContext(null);

function readStoredSession() {
  const rawValue = window.localStorage.getItem(STORAGE_KEY);
  if (!rawValue) {
    return null;
  }

  try {
    return JSON.parse(rawValue);
  } catch {
    window.localStorage.removeItem(STORAGE_KEY);
    return null;
  }
}

function writeStoredSession(nextState) {
  if (!nextState.session?.accessToken || !nextState.user) {
    window.localStorage.removeItem(STORAGE_KEY);
    return;
  }

  window.localStorage.setItem(
    STORAGE_KEY,
    JSON.stringify({
      session: nextState.session,
      user: nextState.user,
    })
  );
}

export function AuthProvider({ children }) {
  const storedState = readStoredSession();
  const [authState, setAuthState] = useState(() =>
    storedState
      ? {
          session: storedState.session,
          status: "restoring",
          user: storedState.user,
        }
      : {
          session: null,
          status: "anonymous",
          user: null,
        }
  );

  useEffect(() => {
    setApiAccessTokenGetter(() => authState.session?.accessToken || null);
  }, [authState.session]);

  useEffect(() => {
    const handleUnauthorized = () => {
      window.localStorage.removeItem(STORAGE_KEY);
      startTransition(() => {
        setAuthState({
          session: null,
          status: "anonymous",
          user: null,
        });
      });
    };

    setApiUnauthorizedHandler(handleUnauthorized);
    return () => setApiUnauthorizedHandler(null);
  }, []);

  useEffect(() => {
    writeStoredSession(authState);
  }, [authState]);

  useEffect(() => {
    if (!storedState?.session?.accessToken) {
      return;
    }

    let isCancelled = false;

    api
      .get("/auth/me")
      .then(({ data }) => {
        if (isCancelled) {
          return;
        }

        startTransition(() => {
          setAuthState({
            session: storedState.session,
            status: "authenticated",
            user: data.user,
          });
        });
      })
      .catch(() => {
        if (isCancelled) {
          return;
        }

        window.localStorage.removeItem(STORAGE_KEY);
        startTransition(() => {
          setAuthState({
            session: null,
            status: "anonymous",
            user: null,
          });
        });
      });

    return () => {
      isCancelled = true;
    };
  }, [storedState]);

  async function login(credentials) {
    const { data } = await api.post("/auth/login", credentials);

    startTransition(() => {
      setAuthState({
        session: {
          accessToken: data.session.access_token,
          expiresAt: data.session.expires_at || null,
          refreshToken: data.session.refresh_token || null,
        },
        status: "authenticated",
        user: data.user,
      });
    });

    return data.user;
  }

  async function changePassword(payload) {
    const { data } = await api.post("/auth/change-password", payload);

    startTransition(() => {
      setAuthState((currentState) => ({
        ...currentState,
        status: "authenticated",
        user: data.user,
      }));
    });

    return data.user;
  }

  async function logout() {
    try {
      await api.post("/auth/logout", {});
    } catch {
      // Logout should still clear local state even if the token is already gone.
    }

    window.localStorage.removeItem(STORAGE_KEY);
    startTransition(() => {
      setAuthState({
        session: null,
        status: "anonymous",
        user: null,
      });
    });
  }

  return (
    <AuthContext.Provider
      value={{
        accessToken: authState.session?.accessToken || null,
        changePassword,
        isAuthenticated: authState.status === "authenticated",
        login,
        logout,
        status: authState.status,
        user: authState.user,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error("useAuth must be used inside AuthProvider");
  }

  return context;
}
