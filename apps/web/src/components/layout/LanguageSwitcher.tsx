import { useTranslation } from 'react-i18next';
import { Globe } from 'lucide-react';

export function LanguageSwitcher({ compact }: { compact?: boolean }) {
  const { i18n } = useTranslation();
  const current = i18n.language?.startsWith('fr') ? 'fr' : 'en';
  const next = current === 'en' ? 'fr' : 'en';

  return (
    <button
      onClick={() => void i18n.changeLanguage(next)}
      className="flex items-center gap-1.5 rounded-md px-2 py-1.5 text-sm font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
      title={current === 'en' ? 'Passer en français' : 'Switch to English'}
    >
      <Globe className="h-3.5 w-3.5" />
      {!compact && <span>{current.toUpperCase()}</span>}
    </button>
  );
}
