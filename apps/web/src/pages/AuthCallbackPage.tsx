import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuthStore } from '@/stores/auth.store';

export function AuthCallbackPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const accessToken = searchParams.get('accessToken');
    const refreshToken = searchParams.get('refreshToken');

    if (!accessToken || !refreshToken) {
      setError('Authentication failed. Missing tokens.');
      setTimeout(() => navigate('/login', { replace: true }), 3000);
      return;
    }

    // Store tokens in the auth store
    useAuthStore.setState({
      accessToken,
      refreshToken,
      isAuthenticated: true,
    });

    // Fetch user profile to complete the login
    useAuthStore
      .getState()
      .fetchProfile()
      .then(() => {
        const user = useAuthStore.getState().user;
        if (user && !user.onboardingCompleted) {
          navigate('/onboarding', { replace: true });
        } else {
          navigate('/cockpit', { replace: true });
        }
      })
      .catch(() => {
        setError('Failed to load user profile.');
        setTimeout(() => navigate('/login', { replace: true }), 3000);
      });
  }, [searchParams, navigate]);

  if (error) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="text-center">
          <p className="text-sm text-destructive">{error}</p>
          <p className="mt-2 text-xs text-muted-foreground">
            Redirecting to login...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background">
      <div className="flex flex-col items-center gap-4">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-border border-t-orange-500" />
        <p className="text-sm text-muted-foreground">
          Completing sign-in...
        </p>
      </div>
    </div>
  );
}

export default AuthCallbackPage;
