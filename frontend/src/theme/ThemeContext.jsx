/* eslint-disable react-refresh/only-export-components */
import {
  createContext,
  startTransition,
  useContext,
  useEffect,
  useState,
} from "react";

const STORAGE_KEY = "wayveda-theme";
const DEFAULT_THEME = "teal";

const THEMES = [
  {
    id: "teal",
    label: "Teal",
  },
  {
    id: "blue",
    label: "Blue",
  },
  {
    id: "cream",
    label: "Cream",
  },
];

const ThemeContext = createContext(null);

function readStoredTheme() {
  const rawValue = window.localStorage.getItem(STORAGE_KEY);
  if (!rawValue) {
    return DEFAULT_THEME;
  }

  return THEMES.some((theme) => theme.id === rawValue) ? rawValue : DEFAULT_THEME;
}

export function ThemeProvider({ children }) {
  const [theme, setTheme] = useState(readStoredTheme);

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    window.localStorage.setItem(STORAGE_KEY, theme);
  }, [theme]);

  function updateTheme(nextTheme) {
    if (!THEMES.some((themeOption) => themeOption.id === nextTheme)) {
      return;
    }

    startTransition(() => {
      setTheme(nextTheme);
    });
  }

  return (
    <ThemeContext.Provider
      value={{
        setTheme: updateTheme,
        theme,
        themes: THEMES,
      }}
    >
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);

  if (!context) {
    throw new Error("useTheme must be used inside ThemeProvider");
  }

  return context;
}
