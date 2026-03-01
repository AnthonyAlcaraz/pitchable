import { useTranslation } from 'react-i18next';
import { Globe } from 'lucide-react';

export function LanguageSwitcher(_props: { compact?: boolean }) {
  const { i18n } = useTranslation();
  const current = i18n.language?.startsWith('fr') ? 'fr' : 'en';
  const next = current === 'en' ? 'fr' : 'en';

  return (
    <button
      onClick={() => void i18n.changeLanguage(next)}
      className="flex items-center gap-1.5 rounded-lg border border-white/15 bg-white/5 px-2.5 py-1.5 text-sm font-semibold text-white/80 transition-all hover:border-orange-500/40 hover:bg-orange-500/10 hover:text-white"
      title={current === 'en' ? 'Passer en français' : 'Switch to English'}
    >
      <Globe className="h-4 w-4" />
      <span>{current.toUpperCase()}</span>
    </button>
  );
}
