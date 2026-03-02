import { useEffect, useState } from 'react';
import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuthStore } from '@/stores/auth.store';
import {
  Gauge,
  BarChart3,
  BookOpen,
  Settings,
  LogOut,
  ChevronLeft,
  ChevronRight,
  CreditCard,
  Menu,
  X,
  Focus,
  Shield,
  Mail,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { PeachLogo } from '@/components/icons/PeachLogo';
import { LanguageSwitcher } from './LanguageSwitcher';
import { api } from '@/lib/api';

export function AppLayout() {
  const { t } = useTranslation();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [bannerDismissed, setBannerDismissed] = useState(false);
  const [resendingVerification, setResendingVerification] = useState(false);
  const [resendMessage, setResendMessage] = useState('');
  const { user, logout } = useAuthStore();
  const location = useLocation();
  const navigate = useNavigate();

  const BASE_NAV_ITEMS = [
    { path: '/cockpit', label: t('nav.cockpit'), icon: Gauge },
    { path: '/analytics', label: t('nav.analytics'), icon: BarChart3 },
    { path: '/pitch-briefs', label: t('nav.pitch_briefs'), icon: BookOpen },
    { path: '/pitch-lens', label: t('nav.pitch_lens'), icon: Focus },
    { path: '/billing', label: t('nav.billing'), icon: CreditCard },
    { path: '/settings', label: t('nav.settings'), icon: Settings },
  ] as const;

  const navItems = user?.role === 'ADMIN'
    ? [...BASE_NAV_ITEMS, { path: '/admin' as const, label: 'Admin', icon: Shield }]
    : [...BASE_NAV_ITEMS];

  useEffect(() => {
    if (user && !user.onboardingCompleted) {
      navigate('/onboarding', { replace: true });
    }
  }, [user, navigate]);

  const handleLogout = async () => {
    await logout();
    navigate('/login', { replace: true });
  };

  const handleResendVerification = async () => {
    setResendingVerification(true);
    setResendMessage('');
    try {
      await api.post<{ message: string }>('/auth/resend-verification');
      setResendMessage('Verification email sent! Check your inbox.');
    } catch (err) {
      setResendMessage(err instanceof Error ? err.message : 'Failed to resend email');
    } finally {
      setResendingVerification(false);
    }
  };

  const showVerificationBanner = user && !user.emailVerified && !bannerDismissed;

  return (
    <div className="flex h-screen bg-background">
      {/* Mobile overlay */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/60 md:hidden"
          onClick={() => setMobileOpen(false)}
          role="presentation"
        />
      )}

      {/* Sidebar — deeper than page background */}
      <aside
        className={cn(
          'fixed inset-y-0 left-0 z-50 flex flex-col border-r border-border bg-sidebar-background transition-all duration-200 md:static',
          collapsed ? 'md:w-16' : 'md:w-56',
          mobileOpen ? 'w-56 translate-x-0' : '-translate-x-full md:translate-x-0',
        )}
      >
        {/* Logo */}
        <div className="flex h-14 items-center justify-between border-b border-border px-4">
          <div className="flex items-center gap-2">
            <PeachLogo className="h-6 w-6 shrink-0" />
            {!collapsed && (
              <span className="text-lg font-semibold text-foreground">
                {t('common.app_name')}
              </span>
            )}
          </div>
          <button
            onClick={() => setMobileOpen(false)}
            className="rounded-md p-1 hover:bg-sidebar-accent md:hidden"
            aria-label={t('nav.close_sidebar')}
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 space-y-1 p-2">
          {navItems.map((item) => {
            const isActive = location.pathname === item.path || location.pathname.startsWith(item.path + '/');
            return (
              <Link
                key={item.path}
                to={item.path}
                onClick={() => setMobileOpen(false)}
                className={cn(
                  'flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors',
                  isActive
                    ? 'bg-orange-500/10 text-orange-400'
                    : 'text-sidebar-foreground hover:bg-sidebar-accent hover:text-foreground',
                )}
              >
                <item.icon className="h-4 w-4 shrink-0" />
                {!collapsed && <span>{item.label}</span>}
              </Link>
            );
          })}
        </nav>

        {/* User section */}
        <div className="border-t border-border p-2">
          {!collapsed && user && (
            <div className="mb-2 flex items-center gap-2 rounded-md px-3 py-2">
              <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-orange-500/10 text-xs font-medium text-orange-400">
                {user.name.charAt(0).toUpperCase()}
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-foreground">
                  {user.name}
                </p>
                <p className="flex items-center gap-1 text-xs text-muted-foreground">
                  <CreditCard className="h-3 w-3" />
                  {user.creditBalance} {t('common.credits')}
                </p>
              </div>
            </div>
          )}
          {collapsed && user && (
            <div className="mb-2 flex justify-center px-1 py-1" title={`${user.creditBalance} ${t('common.credits')}`}>
              <div className="flex h-7 w-7 items-center justify-center rounded-full bg-orange-500/10 text-xs font-bold text-orange-400">
                {user.creditBalance}
              </div>
            </div>
          )}

          <LanguageSwitcher />

          <button
            onClick={() => void handleLogout()}
            className="flex w-full items-center gap-3 rounded-md px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
          >
            <LogOut className="h-4 w-4 shrink-0" />
            {!collapsed && <span>{t('nav.log_out')}</span>}
          </button>

          <button
            onClick={() => setCollapsed(!collapsed)}
            className="mt-1 hidden w-full items-center gap-3 rounded-md px-3 py-2 text-sm text-muted-foreground transition-colors hover:bg-sidebar-accent hover:text-foreground md:flex"
          >
            {collapsed ? (
              <ChevronRight className="h-4 w-4 shrink-0" />
            ) : (
              <>
                <ChevronLeft className="h-4 w-4 shrink-0" />
                <span>{t('nav.collapse')}</span>
              </>
            )}
          </button>
        </div>
      </aside>

      {/* Main area */}
      <div className="flex flex-1 flex-col overflow-hidden">
        {/* Mobile top bar */}
        <header className="flex h-14 items-center gap-3 border-b border-border px-4 md:hidden">
          <button
            onClick={() => setMobileOpen(true)}
            className="rounded-md p-1.5 hover:bg-card"
            aria-label={t('nav.open_sidebar')}
          >
            <Menu className="h-5 w-5" />
          </button>
          <PeachLogo className="h-5 w-5" />
          <span className="text-sm font-semibold text-foreground">{t('common.app_name')}</span>
        </header>

        {/* Email verification banner */}
        {showVerificationBanner && (
          <div className="flex items-center gap-2 border-b border-amber-500/30 bg-amber-500/10 px-4 py-2.5">
            <Mail className="h-4 w-4 shrink-0 text-amber-400" />
            <p className="flex-1 text-sm text-amber-200">
              Please verify your email. Check your inbox or{' '}
              <button
                onClick={() => void handleResendVerification()}
                disabled={resendingVerification}
                className="font-medium text-amber-400 underline hover:text-amber-300 disabled:opacity-50"
              >
                {resendingVerification ? 'sending...' : 'resend verification email'}
              </button>
              {resendMessage && (
                <span className="ml-2 text-xs text-amber-300">{resendMessage}</span>
              )}
            </p>
            <button
              onClick={() => setBannerDismissed(true)}
              className="shrink-0 rounded p-0.5 text-amber-400 hover:bg-amber-500/20"
              aria-label="Dismiss"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        )}

        {/* Main content */}
        <main className="flex-1 overflow-auto">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
