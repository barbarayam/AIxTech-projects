import { useTheme } from '../state/theme';
import { ChevronDownIcon } from './icons';

export function ThemeSelector() {
  const { themeId, themes, setThemeId } = useTheme();

  return (
    <div className="fixed right-4 top-4 z-40">
      <label className="relative flex items-center">
        <span className="sr-only">Theme</span>
        <select
          value={themeId}
          onChange={(e) => setThemeId(e.target.value)}
          aria-label="Theme"
          className="appearance-none rounded-full border border-white/15 bg-white/[0.08] py-1.5 pl-3 pr-8 text-xs font-medium text-white/85 backdrop-blur-xl hover:bg-white/[0.14] focus:outline-none focus:ring-1 focus:ring-white/30"
        >
          {themes.map((theme) => (
            <option key={theme.id} value={theme.id} className="bg-slate-900 text-white">
              {theme.name}
            </option>
          ))}
        </select>
        <ChevronDownIcon className="pointer-events-none absolute right-2.5 h-3 w-3 text-white/60" />
      </label>
    </div>
  );
}
