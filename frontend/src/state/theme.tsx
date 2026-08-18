import { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { logInteraction } from '../api';
import type { ProviderProps, ThemeDefinition, ThemeValue } from '../types';

export const THEMES: ThemeDefinition[] = [
  { id: 'apple', name: 'Apple' },
  { id: 'aurora-glass', name: 'Aurora Glass' },
  { id: 'nordic-frost', name: 'Nordic Frost' },
];

const DEFAULT_THEME_ID = THEMES[0].id;
const STORAGE_KEY = 'weather-starter-theme';

const ThemeContext = createContext<ThemeValue | null>(null);

function readStoredThemeId(): string {
  if (typeof window === 'undefined') return DEFAULT_THEME_ID;
  const stored = window.localStorage.getItem(STORAGE_KEY);
  return stored && THEMES.some((theme) => theme.id === stored) ? stored : DEFAULT_THEME_ID;
}

export function ThemeProvider({ children }: ProviderProps) {
  const [themeId, setThemeIdState] = useState<string>(readStoredThemeId);

  useEffect(() => {
    document.documentElement.dataset.theme = themeId;
    window.localStorage.setItem(STORAGE_KEY, themeId);
  }, [themeId]);

  const setThemeId = useCallback((id: string) => {
    setThemeIdState(id);
    logInteraction('theme_changed', { theme: id });
  }, []);

  const value: ThemeValue = { themeId, themes: THEMES, setThemeId };

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useTheme must be used inside ThemeProvider');
  return ctx;
}
