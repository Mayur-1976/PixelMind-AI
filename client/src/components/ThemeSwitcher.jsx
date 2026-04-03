import { useState, useRef, useEffect } from "react";
import { useTheme } from "../context/ThemeContext";
import { Palette, Check } from "lucide-react";

export default function ThemeSwitcher() {
  const { theme, setTheme, themes } = useTheme();
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div className="relative" ref={menuRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="btn-ghost flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-medium"
        aria-label="Change theme"
        id="theme-switcher-btn"
      >
        <Palette className="w-4 h-4" style={{ color: "var(--pm-primary)" }} />
        <span className="hidden sm:inline" style={{ color: "var(--pm-text-secondary)" }}>Theme</span>
      </button>

      {isOpen && (
        <div className="theme-switcher-menu absolute right-0 top-full mt-2 w-52 rounded-xl p-2 z-50 animate-slide-down">
          {themes.map((t) => (
            <button
              key={t.id}
              onClick={() => { setTheme(t.id); setIsOpen(false); }}
              className={`theme-option w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium ${
                theme === t.id ? "active" : ""
              }`}
              style={{ color: theme === t.id ? "var(--pm-primary)" : "var(--pm-text-secondary)" }}
              id={`theme-option-${t.id}`}
            >
              <span className="text-lg">{t.emoji}</span>
              <div className="flex items-center gap-2 flex-1">
                <span>{t.name}</span>
              </div>
              <div className="flex gap-1">
                {t.colors.map((color, i) => (
                  <div
                    key={i}
                    className="w-3 h-3 rounded-full"
                    style={{ backgroundColor: color }}
                  />
                ))}
              </div>
              {theme === t.id && (
                <Check className="w-4 h-4 shrink-0" style={{ color: "var(--pm-primary)" }} />
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
