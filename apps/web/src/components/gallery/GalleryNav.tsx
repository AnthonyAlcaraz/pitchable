import { Link } from 'react-router-dom';
import { useAuthStore } from '@/stores/auth.store';
import { Layers } from 'lucide-react';

export function GalleryNav() {
  const isAuthenticated = useAuthStore((s) => !!s.user);

  return (
    <nav className="sticky top-0 z-50 border-b border-white/[0.06] bg-[#1c1c1c]/75 backdrop-blur-xl">
      <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-6">
        <Link to="/" className="flex items-center gap-2">
          <Layers className="h-6 w-6 text-orange-500" />
          <span className="text-lg font-bold text-foreground">Pitchable</span>
        </Link>
        <div className="flex items-center gap-4">
          <Link
            to="/gallery"
            className="text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
          >
            Gallery
          </Link>
          {isAuthenticated ? (
            <Link
              to="/cockpit"
              className="rounded-lg bg-orange-500 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-orange-400"
            >
              Dashboard
            </Link>
          ) : (
            <>
              <Link
                to="/login"
                className="text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
              >
                Log in
              </Link>
              <Link
                to="/register"
                className="rounded-lg bg-orange-500 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-orange-400"
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
