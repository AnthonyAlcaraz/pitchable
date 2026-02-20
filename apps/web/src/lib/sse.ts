export interface SseEvent {
  type: 'token' | 'done' | 'error' | 'action' | 'thinking' | 'progress';
  content: string;
  metadata?: Record<string, unknown>;
}

/**
 * Attempt to refresh the access token using the stored refresh token.
 * Returns the new access token on success, or null on failure.
 */
async function refreshAccessToken(): Promise<string | null> {
  try {
    const raw = localStorage.getItem('auth-storage');
    if (!raw) return null;
    const parsed = JSON.parse(raw) as { state?: { refreshToken?: string } };
    const refreshToken = parsed?.state?.refreshToken;
    if (!refreshToken) return null;

    const res = await fetch('/auth/refresh', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${refreshToken}`,
      },
    });
    if (!res.ok) return null;

    const data = (await res.json()) as { accessToken: string; refreshToken: string };
    // Persist new tokens
    const stored = JSON.parse(localStorage.getItem('auth-storage') ?? '{}') as { state: Record<string, unknown> };
    stored.state.accessToken = data.accessToken;
    stored.state.refreshToken = data.refreshToken;
    localStorage.setItem('auth-storage', JSON.stringify(stored));
    return data.accessToken;
  } catch {
    return null;
  }
}

export async function* streamSse(
  url: string,
  body: Record<string, unknown>,
  token: string,
): AsyncGenerator<SseEvent> {
  let res = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(body),
  });

  // On 401, try refreshing the token and retry once
  if (res.status === 401) {
    const newToken = await refreshAccessToken();
    if (newToken) {
      res = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${newToken}`,
        },
        body: JSON.stringify(body),
      });
    }
  }

  if (!res.ok) {
    if (res.status === 401) {
      // Token refresh failed — force re-login
      localStorage.removeItem('auth-storage');
      window.location.href = '/login';
      throw new Error('Session expired — please log in again');
    }
    throw new Error(`Chat request failed: ${res.status}`);
  }

  const reader = res.body?.getReader();
  if (!reader) throw new Error('No response body');

  const decoder = new TextDecoder();
  let buffer = '';

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split('\n');
    buffer = lines.pop() ?? '';

    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed.startsWith('data: ')) continue;

      const data = trimmed.slice(6);
      if (data === '[DONE]') return;

      try {
        yield JSON.parse(data) as SseEvent;
      } catch {
        // skip malformed events
      }
    }
  }
}
