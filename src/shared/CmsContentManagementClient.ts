import { storage } from '@zaiusinc/app-sdk';

interface CmsApiSettings {
  cms_base_url: string;
  access_token?: string;
  basic_username?: string;
  basic_password?: string;
}

export class CmsContentManagementClient {
  private readonly settings: CmsApiSettings;

  private constructor(settings: CmsApiSettings) {
    this.settings = settings;
  }

  public static async create(): Promise<CmsContentManagementClient> {
    const raw = await storage.settings.get('auth');
    const settings = raw as unknown as Partial<CmsApiSettings> | undefined;
    if (!settings || typeof settings.cms_base_url !== 'string') {
      throw new Error('CMS API settings are missing. Please configure cms_base_url in settings.');
    }
    return new CmsContentManagementClient(settings as CmsApiSettings);
  }

  public buildRoot(): string {
    const base = this.settings.cms_base_url.replace(/\/$/, '');
    const root = `${base}/api/episerver/v3.0`;
    // Ensure correct scheme and single trailing slash behavior
    return root.replace(':/', '://');
  }

  public buildHeaders(contentType?: string): Record<string, string> {
    const headers: Record<string, string> = { Accept: 'application/json' };
    if (contentType) headers['Content-Type'] = contentType;
    if (this.settings.basic_username) {
      const encoded = Buffer.from(
        `${this.settings.basic_username}:${this.settings.basic_password ?? ''}`,
      ).toString('base64');
      headers.Authorization = `Basic ${encoded}`;
    } else if (this.settings.access_token) {
      headers.Authorization = `Bearer ${this.settings.access_token}`;
    }
    return headers;
  }

  public async getJson(
    path: string,
    query?: Record<string, string | number | boolean>,
  ): Promise<
    { ok: true; status: number; data: unknown } | { ok: false; status: number; errorText: string }
  > {
    const root = this.buildRoot();
    const base = root.endsWith('/') ? root : `${root}/`;
    const cleanPath = String(path).replace(/^\/+/, '');
    const url = new URL(cleanPath, base);
    if (query) {
      Object.entries(query).forEach(([k, v]) => {
        if (v !== undefined && v !== null) url.searchParams.set(k, String(v));
      });
    }
    const resp = await fetch(url.toString(), { method: 'GET', headers: this.buildHeaders() });
    if (!resp.ok) {
      return { ok: false, status: resp.status, errorText: await resp.text() };
    }
    return { ok: true, status: resp.status, data: await resp.json() };
  }

  public async postJson(
    path: string,
    body: unknown,
    query?: Record<string, string | number | boolean>,
  ): Promise<
    { ok: true; status: number; data: unknown } | { ok: false; status: number; errorText: string }
  > {
    const root = this.buildRoot();
    const base = root.endsWith('/') ? root : `${root}/`;
    const cleanPath = String(path).replace(/^\/+/, '');
    const url = new URL(cleanPath, base);
    if (query) {
      Object.entries(query).forEach(([k, v]) => {
        if (v !== undefined && v !== null) url.searchParams.set(k, String(v));
      });
    }
    const resp = await fetch(url.toString(), {
      method: 'POST',
      headers: this.buildHeaders('application/json'),
      body: JSON.stringify(body ?? {}),
    });
    if (!resp.ok) {
      return { ok: false, status: resp.status, errorText: await resp.text() };
    }
    const contentType = resp.headers.get('content-type') || '';
    if (contentType.includes('application/json')) {
      return { ok: true, status: resp.status, data: await resp.json() };
    }
    return { ok: true, status: resp.status, data: await resp.text() };
  }
}
