type HttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';

interface ApiError {
  message: string;
  statusCode: number;
}

class ApiClient {
  private isRefreshing = false;
  private refreshPromise: Promise<boolean> | null = null;

  private getTokens() {
    try {
      const raw = localStorage.getItem('auth-storage');
      if (!raw) return { accessToken: null, refreshToken: null };
      const parsed = JSON.parse(raw) as {
        state?: { accessToken?: string; refreshToken?: string };
      };
      return {
        accessToken: parsed.state?.accessToken ?? null,
        refreshToken: parsed.state?.refreshToken ?? null,
      };
    } catch {
      return { accessToken: null, refreshToken: null };
    }
  }

  private async request<T>(
    method: HttpMethod,
    url: string,
    body?: unknown,
    skipAuth = false,
  ): Promise<T> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };

    if (!skipAuth) {
      const { accessToken } = this.getTokens();
      if (accessToken) {
        headers['Authorization'] = `Bearer ${accessToken}`;
      }
    }

    const response = await fetch(url, {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined,
    });

    if (response.status === 401 && !skipAuth) {
      const refreshed = await this.attemptRefresh();
      if (refreshed) {
        return this.request<T>(method, url, body, true);
      }
      // Refresh failed - clear auth and redirect
      localStorage.removeItem('auth-storage');
      window.location.href = '/login';
      throw new Error('Session expired');
    }

    if (!response.ok) {
      const errorBody = (await response.json().catch(() => ({
        message: response.statusText,
        statusCode: response.status,
      }))) as ApiError;
      throw new Error(errorBody.message || `Request failed: ${response.status}`);
    }

    // Handle 204 No Content or empty body
    if (response.status === 204) {
      return undefined as T;
    }

    const text = await response.text();
    if (!text) {
      return undefined as T;
    }

    return JSON.parse(text) as T;
  }

  private async attemptRefresh(): Promise<boolean> {
    if (this.isRefreshing && this.refreshPromise) {
      return this.refreshPromise;
    }

    this.isRefreshing = true;
    this.refreshPromise = this.doRefresh();

    try {
      return await this.refreshPromise;
    } finally {
      this.isRefreshing = false;
      this.refreshPromise = null;
    }
  }

  private async doRefresh(): Promise<boolean> {
    const { refreshToken } = this.getTokens();
    if (!refreshToken) return false;

    try {
      const response = await fetch('/auth/refresh', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${refreshToken}`,
        },
      });

      if (!response.ok) return false;

      const data = (await response.json()) as {
        accessToken: string;
        refreshToken: string;
      };

      // Update tokens in localStorage
      const raw = localStorage.getItem('auth-storage');
      if (raw) {
        const parsed = JSON.parse(raw) as { state: Record<string, unknown> };
        parsed.state.accessToken = data.accessToken;
        parsed.state.refreshToken = data.refreshToken;
        localStorage.setItem('auth-storage', JSON.stringify(parsed));
      }

      return true;
    } catch {
      return false;
    }
  }

  get<T>(url: string): Promise<T> {
    return this.request<T>('GET', url);
  }

  post<T>(url: string, body?: unknown): Promise<T> {
    return this.request<T>('POST', url, body);
  }

  put<T>(url: string, body?: unknown): Promise<T> {
    return this.request<T>('PUT', url, body);
  }

  patch<T>(url: string, body?: unknown): Promise<T> {
    return this.request<T>('PATCH', url, body);
  }

  delete<T>(url: string): Promise<T> {
    return this.request<T>('DELETE', url);
  }

  async uploadFile<T>(url: string, file: File, extraFields?: Record<string, string>): Promise<T> {
    const formData = new FormData();
    formData.append('file', file);
    if (extraFields) {
      for (const [key, value] of Object.entries(extraFields)) {
        formData.append(key, value);
      }
    }

    const { accessToken } = this.getTokens();
    const headers: Record<string, string> = {};
    if (accessToken) {
      headers['Authorization'] = `Bearer ${accessToken}`;
    }

    const response = await fetch(url, {
      method: 'POST',
      headers,
      body: formData,
    });

    if (response.status === 401) {
      const refreshed = await this.attemptRefresh();
      if (refreshed) {
        return this.uploadFile<T>(url, file, extraFields);
      }
      localStorage.removeItem('auth-storage');
      window.location.href = '/login';
      throw new Error('Session expired');
    }

    if (!response.ok) {
      const errorBody = (await response.json().catch(() => ({
        message: response.statusText,
        statusCode: response.status,
      }))) as ApiError;
      throw new Error(errorBody.message || `Upload failed: ${response.status}`);
    }

    return response.json() as Promise<T>;
  }
}

export const api = new ApiClient();
