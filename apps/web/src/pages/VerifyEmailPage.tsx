import { useEffect, useState, useRef } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { api } from '@/lib/api';
import { PeachLogo } from '@/components/icons/PeachLogo';

type VerifyState = 'loading' | 'success' | 'error';

export function VerifyEmailPage() {
  const { t } = useTranslation();
  const [searchParams] = useSearchParams();
  const [state, setState] = useState<VerifyState>('loading');
  const [errorMsg, setErrorMsg] = useState('');
  const [resending, setResending] = useState(false);
  const [resendSuccess, setResendSuccess] = useState(false);
  const attemptedRef = useRef(false);

  const token = searchParams.get('token');

  useEffect(() => {
    if (!token) {
      setState('error');
      setErrorMsg('No verification token provided.');
      return;
    }

    if (attemptedRef.current) return;
    attemptedRef.current = true;

    void (async () => {
      try {
        await api.post<{ message: string }>('/auth/verify-email', { token }, { skipAuth: true });
        setState('success');
      } catch (err) {
        setState('error');
        setErrorMsg(err instanceof Error ? err.message : 'Verification failed');
      }
    })();
  }, [token]);

  const handleResend = async () => {
    setResending(true);
    try {
      await api.post<{ message: string }>('/auth/resend-verification');
      setResendSuccess(true);
    } catch {
      // If not logged in, can't resend via this page
      setErrorMsg('Please log in first, then resend from the dashboard.');
    } finally {
      setResending(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="w-full max-w-md rounded-lg border border-border bg-card p-8 shadow-md">
        <div className="mb-8 flex flex-col items-center gap-2">
          <PeachLogo className="h-10 w-10" />
          <h1 className="text-2xl font-bold text-foreground">{t('common.app_name')}</h1>
          <p className="text-sm text-muted-foreground">Email Verification</p>
        </div>

        {state === 'loading' && (
          <div className="flex flex-col items-center gap-4">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-border border-t-orange-500" />
            <p className="text-sm text-muted-foreground">Verifying your email...</p>
          </div>
        )}

        {state === 'success' && (
          <div className="space-y-4 text-center">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-green-500/10">
              <svg className="h-6 w-6 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h2 className="text-lg font-semibold text-foreground">Email Verified!</h2>
            <p className="text-sm text-muted-foreground">
              Your email has been verified successfully. You can now access all features.
            </p>
            <Link
              to="/cockpit"
              className="mt-4 inline-block rounded-md bg-primary px-6 py-2.5 text-sm font-medium text-primary-foreground hover:bg-primary/90"
            >
              Go to Dashboard
            </Link>
          </div>
        )}

        {state === 'error' && (
          <div className="space-y-4 text-center">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-destructive/10">
              <svg className="h-6 w-6 text-destructive" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </div>
            <h2 className="text-lg font-semibold text-foreground">Verification Failed</h2>
            <p className="text-sm text-muted-foreground">{errorMsg}</p>

            {resendSuccess ? (
              <p className="text-sm text-green-500">
                A new verification email has been sent. Check your inbox.
              </p>
            ) : (
              <button
                onClick={() => void handleResend()}
                disabled={resending}
                className="mt-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
              >
                {resending ? 'Sending...' : 'Resend Verification Email'}
              </button>
            )}

            <p className="text-sm text-muted-foreground">
              <Link to="/login" className="font-medium text-primary hover:underline">
                Back to Login
              </Link>
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

export default VerifyEmailPage;
