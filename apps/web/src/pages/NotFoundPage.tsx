import { Link } from 'react-router-dom';
import { Home, LayoutDashboard } from 'lucide-react';

export function NotFoundPage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-[#0a0a0f] px-6">
      <p className="bg-gradient-to-b from-white to-white/20 bg-clip-text text-[8rem] font-extrabold leading-none text-transparent sm:text-[12rem]">
        404
      </p>

      <h1 className="mb-2 text-2xl font-bold text-white">Page not found</h1>
      <p className="mb-10 max-w-md text-center text-gray-400">
        The page you are looking for does not exist or has been moved.
      </p>

      <div className="flex flex-col gap-3 sm:flex-row">
        <Link
          to="/"
          className="flex items-center justify-center gap-2 rounded-xl border border-white/10 px-6 py-3 font-medium text-white transition-colors hover:bg-white/5"
        >
          <Home className="h-4 w-4" />
          Go back home
        </Link>
        <Link
          to="/cockpit"
          className="flex items-center justify-center gap-2 rounded-xl bg-orange-500 px-6 py-3 font-medium text-white shadow-lg shadow-orange-500/20 transition-colors hover:bg-orange-400"
        >
          <LayoutDashboard className="h-4 w-4" />
          Go to dashboard
        </Link>
      </div>
    </div>
  );
}

export default NotFoundPage;
