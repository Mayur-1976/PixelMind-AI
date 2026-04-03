import { createContext, useContext, useState, useEffect } from "react";

const THEMES = [
  { id: "midnight", name: "Midnight", emoji: "🌙", colors: ["#7c3aed", "#06b6d4"] },
  { id: "light", name: "Light", emoji: "☀️", colors: ["#7c3aed", "#0891b2"] },
  { id: "cyberpunk", name: "Cyberpunk", emoji: "🤖", colors: ["#00ff88", "#ff0080"] },
  { id: "sunset", name: "Sunset", emoji: "🌅", colors: ["#f97316", "#ec4899"] },
];

const ThemeContext = createContext(null);

export function ThemeProvider({ children }) {
  const [theme, setThemeState] = useState(() => {
    if (typeof window !== "undefined") {
      return localStorage.getItem("pm-theme") || "midnight";
    }
    return "midnight";
  });

  const setTheme = (newTheme) => {
    setThemeState(newTheme);
    localStorage.setItem("pm-theme", newTheme);
    document.documentElement.setAttribute("data-theme", newTheme);
  };

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
  }, []);

  return (
    <ThemeContext.Provider value={{ theme, setTheme, themes: THEMES }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error("useTheme must be used within a ThemeProvider");
  }
  return context;
}

export { THEMES };
