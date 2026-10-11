"use client";

import { createContext, useContext, useEffect, useState } from "react";
import { SessionProvider } from "next-auth/react";

const ThemeContext = createContext(null);

function ThemeProvider({ children }) {
  const [theme, setTheme] = useState(null);

  useEffect(() => {
    let savedTheme;
    try {
      savedTheme = window.localStorage.getItem("trustbid-theme");
    } catch (error) {
      console.error("[Theme] Could not read saved theme:", error);
    }

    const initialTheme = savedTheme === "light" || savedTheme === "dark"
      ? savedTheme
      : window.matchMedia("(prefers-color-scheme: light)").matches
        ? "light"
        : "dark";
    document.documentElement.dataset.theme = initialTheme;
    const timeout = setTimeout(() => setTheme(initialTheme), 0);
    return () => clearTimeout(timeout);
  }, []);

  const toggleTheme = () => {
    const nextTheme = theme === "light" ? "dark" : "light";
    document.documentElement.dataset.theme = nextTheme;
    setTheme(nextTheme);
    try {
      window.localStorage.setItem("trustbid-theme", nextTheme);
    } catch (error) {
      console.error("[Theme] Could not save theme preference:", error);
    }
  };

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error("useTheme must be used within the application providers.");
  }
  return context;
}

export function AuthProvider({ children }) {
  return (
    <ThemeProvider>
      <SessionProvider>{children}</SessionProvider>
    </ThemeProvider>
  );
}