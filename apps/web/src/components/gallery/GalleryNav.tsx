import { Link } from 'react-router-dom';
import { useAuthStore } from '@/stores/auth.store';
import { Layers } from 'lucide-react';

export function GalleryNav() {
  const isAuthenticated = useAuthStore((s) => !!s.user);

  return (
    <nav className="sticky top-0 z-50 border-b border-slate-200 bg-white/80 backdrop-blur-md">
      <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-6">
        <Link to="/" className="flex items-center gap-2">
          <Layers className="h-6 w-6 text-blue-600" />
          <span className="text-lg font-bold text-slate-900">Pitchable</span>
        </Link>
        <div className="flex items-center gap-4">
          <Link
            to="/gallery"
            className="text-sm font-medium text-slate-600 transition-colors hover:text-slate-900"
          >
            Gallery
          </Link>
          {isAuthenticated ? (
            <Link
              to="/cockpit"
              className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-700"
            >
              Dashboard
            </Link>
          ) : (
            <>
              <Link
                to="/login"
                className="text-sm font-medium text-slate-600 transition-colors hover:text-slate-900"
              >
                Log in
              </Link>
              <Link
                to="/register"
                className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-700"
              >
                Sign up free
              </Link>
            </>
          )}
        </div>
      </div>
    </nav>
  );
}
