import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useApiKeysStore } from '@/stores/api-keys.store';
import { Key, Plus, Copy, RotateCw, Trash2, Check, AlertTriangle } from 'lucide-react';

export function ApiKeysPage() {
  const { t } = useTranslation();

  const AVAILABLE_SCOPES = [
    { value: 'presentations:read', label: t('api_keys.scope_presentations_read'), description: t('api_keys.scope_presentations_read_desc') },
    { value: 'presentations:write', label: t('api_keys.scope_presentations_write'), description: t('api_keys.scope_presentations_write_desc') },
    { value: 'generation', label: t('api_keys.scope_generation'), description: t('api_keys.scope_generation_desc') },
    { value: 'export', label: t('api_keys.scope_export'), description: t('api_keys.scope_export_desc') },
  ];

  const keys = useApiKeysStore((s) => s.keys);
  const isLoading = useApiKeysStore((s) => s.isLoading);
  const loadKeys = useApiKeysStore((s) => s.loadKeys);
  const createKey = useApiKeysStore((s) => s.createKey);
  const revokeKey = useApiKeysStore((s) => s.revokeKey);
  const rotateKey = useApiKeysStore((s) => s.rotateKey);

  const [showCreate, setShowCreate] = useState(false);
  const [newKeyName, setNewKeyName] = useState('');
  const [selectedScopes, setSelectedScopes] = useState<string[]>(['presentations:read']);
  const [newPlaintext, setNewPlaintext] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [confirmRevoke, setConfirmRevoke] = useState<string | null>(null);

  useEffect(() => { loadKeys(); }, [loadKeys]);

  const handleCreate = async () => {
    if (!newKeyName.trim() || selectedScopes.length === 0) return;
    const plaintext = await createKey(newKeyName.trim(), selectedScopes);
    setNewPlaintext(plaintext);
    setNewKeyName('');
    setSelectedScopes(['presentations:read']);
    setShowCreate(false);
  };

  const handleCopy = async (text: string) => {
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleRotate = async (id: string) => {
    const plaintext = await rotateKey(id);
    setNewPlaintext(plaintext);
  };

  const handleRevoke = async (id: string) => {
    await revokeKey(id);
    setConfirmRevoke(null);
  };

  const toggleScope = (scope: string) => {
    setSelectedScopes((prev) =>
      prev.includes(scope) ? prev.filter((s) => s !== scope) : [...prev, scope]
    );
  };

  const activeKeys = keys.filter((k) => !k.isRevoked);
  const revokedKeys = keys.filter((k) => k.isRevoked);

  return (
    <div className="p-4 sm:p-6 lg:p-8">
      <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">{t('api_keys.title')}</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {t('api_keys.subtitle')}
          </p>
        </div>
        <button
          onClick={() => setShowCreate(true)}
          className="flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
        >
          <Plus className="h-4 w-4" />
          {t('api_keys.create_key')}
        </button>
      </div>

      {/* New key banner */}
      {newPlaintext && (
        <div className="mb-6 rounded-lg border border-yellow-500/30 bg-yellow-500/5 p-4">
          <div className="mb-2 flex items-center gap-2 text-yellow-500">
            <AlertTriangle className="h-4 w-4" />
            <span className="text-sm font-semibold">{t('api_keys.save_key_warning')}</span>
          </div>
          <div className="flex items-center gap-2">
            <code className="flex-1 rounded bg-background px-3 py-2 text-sm font-mono text-foreground">
              {newPlaintext}
            </code>
            <button
              onClick={() => handleCopy(newPlaintext)}
              className="flex items-center gap-1 rounded-md border border-border px-3 py-2 text-sm hover:bg-accent"
            >
              {copied ? <Check className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4" />}
              {copied ? t('common.copied') : t('common.copy')}
            </button>
          </div>
          <button
            onClick={() => setNewPlaintext(null)}
            className="mt-2 text-xs text-muted-foreground hover:text-foreground"
          >
            {t('common.dismiss')}
          </button>
        </div>
      )}

      {/* Create modal */}
      {showCreate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
          <div className="w-full max-w-md rounded-lg border border-border bg-card p-6 shadow-xl">
            <h2 className="mb-4 text-lg font-semibold text-foreground">{t('api_keys.create_dialog_title')}</h2>

            <label className="mb-1 block text-sm text-muted-foreground">{t('api_keys.name_label')}</label>
            <input
              value={newKeyName}
              onChange={(e) => setNewKeyName(e.target.value)}
              placeholder={t('api_keys.name_placeholder')}
              className="mb-4 w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none"
            />

            <label className="mb-2 block text-sm text-muted-foreground">{t('api_keys.scopes_label')}</label>
            <div className="mb-4 space-y-2">
              {AVAILABLE_SCOPES.map((scope) => (
                <label
                  key={scope.value}
                  className="flex cursor-pointer items-start gap-3 rounded-md border border-border p-3 hover:bg-accent/50"
                >
                  <input
                    type="checkbox"
                    checked={selectedScopes.includes(scope.value)}
                    onChange={() => toggleScope(scope.value)}
                    className="mt-0.5 rounded border-border"
                  />
                  <div>
                    <p className="text-sm font-medium text-foreground">{scope.label}</p>
                    <p className="text-xs text-muted-foreground">{scope.description}</p>
                  </div>
                </label>
              ))}
            </div>

            <div className="flex justify-end gap-2">
              <button
                onClick={() => setShowCreate(false)}
                className="rounded-md border border-border px-4 py-2 text-sm text-muted-foreground hover:bg-accent"
              >
                {t('common.cancel')}
              </button>
              <button
                onClick={handleCreate}
                disabled={!newKeyName.trim() || selectedScopes.length === 0}
                className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
              >
                {t('api_keys.create_key')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Keys table */}
      {isLoading ? (
        <div className="flex justify-center py-16">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
        </div>
      ) : activeKeys.length === 0 ? (
        <div className="rounded-lg border border-dashed border-border p-12 text-center">
          <Key className="mx-auto mb-3 h-10 w-10 text-muted-foreground/50" />
          <p className="text-sm text-muted-foreground">{t('api_keys.no_keys')}</p>
          <p className="mt-1 text-xs text-muted-foreground">{t('api_keys.no_keys_hint')}</p>
        </div>
      ) : (
        <div className="space-y-3">
          {activeKeys.map((key) => (
            <div
              key={key.id}
              className="rounded-lg border border-border bg-card p-4"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Key className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <p className="text-sm font-medium text-foreground">{key.name}</p>
                    <p className="text-xs font-mono text-muted-foreground">{key.keyPrefix}...</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleRotate(key.id)}
                    title={t('api_keys.rotate_key')}
                    className="rounded-md p-1.5 text-muted-foreground hover:bg-accent hover:text-foreground"
                  >
                    <RotateCw className="h-4 w-4" />
                  </button>
                  {confirmRevoke === key.id ? (
                    <button
                      onClick={() => handleRevoke(key.id)}
                      className="rounded-md bg-red-500/10 px-2 py-1 text-xs text-red-500 hover:bg-red-500/20"
                    >
                      {t('api_keys.confirm_revoke')}
                    </button>
                  ) : (
                    <button
                      onClick={() => setConfirmRevoke(key.id)}
                      title={t('api_keys.revoke_key')}
                      className="rounded-md p-1.5 text-muted-foreground hover:bg-red-500/10 hover:text-red-500"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  )}
                </div>
              </div>
              <div className="mt-2 flex flex-wrap gap-1.5">
                {key.scopes.map((scope) => (
                  <span key={scope} className="rounded-full bg-primary/10 px-2 py-0.5 text-xs text-primary">
                    {scope}
                  </span>
                ))}
              </div>
              <div className="mt-2 flex gap-4 text-xs text-muted-foreground">
                <span>{t('api_keys.created_date', { date: new Date(key.createdAt).toLocaleDateString() })}</span>
                {key.lastUsedAt && <span>{t('api_keys.last_used_date', { date: new Date(key.lastUsedAt).toLocaleDateString() })}</span>}
                {key.expiresAt && <span>{t('api_keys.expires_date', { date: new Date(key.expiresAt).toLocaleDateString() })}</span>}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Revoked keys */}
      {revokedKeys.length > 0 && (
        <div className="mt-8">
          <h2 className="mb-3 text-sm font-semibold text-muted-foreground">{t('api_keys.revoked_keys_title')}</h2>
          <div className="space-y-2">
            {revokedKeys.map((key) => (
              <div key={key.id} className="rounded-lg border border-border/50 bg-card/50 p-3 opacity-60">
                <div className="flex items-center gap-2">
                  <Key className="h-3.5 w-3.5 text-muted-foreground" />
                  <span className="text-sm text-muted-foreground">{key.name}</span>
                  <span className="text-xs font-mono text-muted-foreground">{key.keyPrefix}...</span>
                  <span className="ml-auto rounded-full bg-red-500/10 px-2 py-0.5 text-xs text-red-500">{t('common.revoked')}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export default ApiKeysPage;
