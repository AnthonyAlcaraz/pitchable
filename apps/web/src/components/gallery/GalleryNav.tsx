import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuthStore } from '@/stores/auth.store';
import { PeachLogo } from '@/components/icons/PeachLogo';
import { LanguageSwitcher } from '../layout/LanguageSwitcher';

export function GalleryNav() {
  const { t } = useTranslation();
  const isAuthenticated = useAuthStore((s) => !!s.user);

  return (
    <nav className="sticky top-0 z-50 border-b border-white/[0.06] bg-[#1c1c1c]/75 backdrop-blur-xl">
      <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-6">
        <Link to="/" className="flex items-center gap-2">
          <PeachLogo className="h-6 w-6" />
          <span className="text-lg font-bold text-foreground">{t('common.app_name')}</span>
        </Link>
        <div className="flex items-center gap-2 sm:gap-4">
          <LanguageSwitcher compact />
          <Link
            to="/gallery"
            className="hidden text-sm font-medium text-muted-foreground transition-colors hover:text-foreground sm:block"
          >
            {t('gallery.nav.gallery')}
          </Link>
          {isAuthenticated ? (
            <Link
              to="/cockpit"
              className="whitespace-nowrap rounded-lg bg-orange-500 px-3 py-1.5 text-xs font-medium text-white transition-colors hover:bg-orange-400 sm:px-4 sm:py-2 sm:text-sm"
            >
              {t('gallery.nav.dashboard')}
            </Link>
          ) : (
            <>
              <Link
                to="/login"
                className="hidden text-sm font-medium text-muted-foreground transition-colors hover:text-foreground sm:block"
              >
                {t('gallery.nav.log_in')}
              </Link>
              <Link
                to="/register"
                className="whitespace-nowrap rounded-lg bg-orange-500 px-3 py-1.5 text-xs font-medium text-white transition-colors hover:bg-orange-400 sm:px-4 sm:py-2 sm:text-sm"
              >
                {t('gallery.nav.sign_up_free')}
              </Link>
            </>
          )}
        </div>
      </div>
    </nav>
  );
}
