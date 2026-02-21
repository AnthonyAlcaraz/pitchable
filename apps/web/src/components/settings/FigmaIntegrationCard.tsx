import { useState, useEffect } from 'react';
import { Figma, Check, X, Loader2, ExternalLink, AlertTriangle } from 'lucide-react';
import { api } from '@/lib/api';
import { cn } from '@/lib/utils';

interface FigmaStatus {
  connected: boolean;
  figmaUserId?: string;
  figmaUserName?: string;
  isValid?: boolean;
  lastValidatedAt?: string;
  connectedAt?: string;
  planTier?: string;
  dailyApiReads?: number;
  planWarning?: string;
  isRateLimited?: boolean;
  retryAfterSeconds?: number;
}

export function FigmaIntegrationCard() {
  const [status, setStatus] = useState<FigmaStatus | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [token, setToken] = useState('');
  const [isConnecting, setIsConnecting] = useState(false);
  const [isDisconnecting, setIsDisconnecting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showTokenInput, setShowTokenInput] = useState(false);

  useEffect(() => {
    loadStatus();
  }, []);

  async function loadStatus() {
    setIsLoading(true);
    try {
      const data = await api.get<FigmaStatus>('/figma/status');
      setStatus(data);
    } catch {
      setStatus({ connected: false });
    } finally {
      setIsLoading(false);
    }
  }

  async function handleConnect() {
    if (!token.trim()) return;
    setIsConnecting(true);
    setError(null);
    try {
      await api.post('/figma/connect', { accessToken: token.trim() });
      setToken('');
      setShowTokenInput(false);
      await loadStatus();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to connect');
    } finally {
      setIsConnecting(false);
    }
  }

  async function handleDisconnect() {
    setIsDisconnecting(true);
    try {
      await api.delete('/figma/disconnect');
      setStatus({ connected: false });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to disconnect');
    } finally {
      setIsDisconnecting(false);
    }
  }

  if (isLoading) {
    return (
      <section className="rounded-lg border border-border bg-card p-6">
        <div className="flex items-center gap-2">
          <Figma className="h-5 w-5 text-muted-foreground" />
          <h2 className="text-lg font-semibold text-foreground">Figma</h2>
        </div>
        <div className="mt-4 flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
          Loading...
        </div>
      </section>
    );
  }

  return (
    <section className="rounded-lg border border-border bg-card p-6">
      <div className="mb-4 flex items-center gap-2">
        <Figma className="h-5 w-5 text-muted-foreground" />
        <h2 className="text-lg font-semibold text-foreground">Figma</h2>
        {status?.connected && (
          <span className={cn(
            'ml-auto inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium',
            status.isValid
              ? 'bg-green-500/10 text-green-600'
              : 'bg-amber-500/10 text-amber-600',
          )}>
            <span className={cn(
              'h-1.5 w-1.5 rounded-full',
              status.isValid ? 'bg-green-500' : 'bg-amber-500',
            )} />
            {status.isValid ? 'Connected' : 'Token Invalid'}
          </span>
        )}
      </div>

      {status?.connected ? (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Figma User</span>
            <span className="text-sm font-medium text-foreground">
              {status.figmaUserName ?? status.figmaUserId ?? '-'}
            </span>
          </div>
          {status.planTier && (
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Plan</span>
              <span className="text-sm font-medium text-foreground">
                {status.planTier}
              </span>
            </div>
          )}
          {status.dailyApiReads != null && (
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Daily API Reads</span>
              <span className="text-sm font-medium text-foreground">
                ~{status.dailyApiReads}
              </span>
            </div>
          )}
          {status.connectedAt && (
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Connected</span>
              <span className="text-sm text-foreground">
                {new Date(status.connectedAt).toLocaleDateString()}
              </span>
            </div>
          )}

          {/* Plan warning */}
          {status.planWarning && (
            <div className="flex gap-2 rounded-md border border-amber-200 bg-amber-50 p-2.5 dark:border-amber-800 dark:bg-amber-900/20">
              <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-amber-600" />
              <p className="text-xs text-amber-700 dark:text-amber-400">
                {status.planWarning}
              </p>
            </div>
          )}

          {/* Rate limited warning */}
          {status.isRateLimited && (
            <div className="flex gap-2 rounded-md border border-red-200 bg-red-50 p-2.5 dark:border-red-800 dark:bg-red-900/20">
              <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-red-600" />
              <p className="text-xs text-red-700 dark:text-red-400">
                Figma API rate limit exceeded.
                {status.retryAfterSeconds != null && status.retryAfterSeconds > 0 && (
                  <> Reset in ~{status.retryAfterSeconds > 3600
                    ? `${Math.ceil(status.retryAfterSeconds / 3600)} hours`
                    : `${Math.ceil(status.retryAfterSeconds / 60)} minutes`
                  }.</>
                )}
              </p>
            </div>
          )}

          <button
            onClick={handleDisconnect}
            disabled={isDisconnecting}
            className="mt-2 flex items-center gap-1.5 rounded-lg border border-red-200 px-3 py-1.5 text-sm text-red-600 hover:bg-red-50 disabled:opacity-50"
          >
            {isDisconnecting ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <X className="h-3.5 w-3.5" />
            )}
            Disconnect
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          <p className="text-sm text-muted-foreground">
            Connect your Figma account to pull designer-made graphics (diagrams, charts, mockups)
            into your slides.
          </p>

          {showTokenInput ? (
            <div className="space-y-2">
              <label className="block text-sm font-medium text-foreground">
                Personal Access Token
              </label>
              <input
                type="password"
                value={token}
                onChange={(e) => setToken(e.target.value)}
                placeholder="figd_..."
                className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                autoFocus
                onKeyDown={(e) => e.key === 'Enter' && handleConnect()}
              />
              <p className="text-xs text-muted-foreground">
                Generate a token at{' '}
                <a
                  href="https://www.figma.com/developers/api#access-tokens"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-primary hover:underline"
                >
                  Figma Settings <ExternalLink className="inline h-3 w-3" />
                </a>
                {' '}&mdash; free accounts work.
              </p>
              {error && (
                <p className="text-xs text-red-600">{error}</p>
              )}
              <div className="flex gap-2">
                <button
                  onClick={handleConnect}
                  disabled={isConnecting || !token.trim()}
                  className="flex items-center gap-1.5 rounded-lg bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
                >
                  {isConnecting ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <Check className="h-3.5 w-3.5" />
                  )}
                  Connect
                </button>
                <button
                  onClick={() => { setShowTokenInput(false); setToken(''); setError(null); }}
                  className="rounded-lg border border-border px-3 py-1.5 text-sm hover:bg-accent"
                >
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <button
              onClick={() => setShowTokenInput(true)}
              className="flex items-center gap-1.5 rounded-lg bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground hover:bg-primary/90"
            >
              <Figma className="h-3.5 w-3.5" />
              Connect Figma
            </button>
          )}
        </div>
      )}
    </section>
  );
}
