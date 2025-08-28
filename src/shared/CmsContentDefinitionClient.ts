import { storage } from '@zaiusinc/app-sdk';

interface CmsApiSettings {
  cms_base_url: string;
  access_token?: string;
}

export class CmsContentDefinitionClient {
  private readonly settings: CmsApiSettings;

  private constructor(settings: CmsApiSettings) {
    this.settings = settings;
  }

  public static async create(): Promise<CmsContentDefinitionClient> {
    const raw = await storage.settings.get('auth');
    const settings = raw as unknown as Partial<CmsApiSettings> | undefined;
    if (!settings || typeof settings.cms_base_url !== 'string') {
      throw new Error('CMS API settings are missing. Please configure cms_base_url in settings.');
    }
    return new CmsContentDefinitionClient(settings as CmsApiSettings);
  }

  public buildRoot(): string {
    const base = this.settings.cms_base_url.replace(/\/$/, '');
    const root = `${base}/api/episerver/v3.0`;
    return root.replace(':/', '://');
  }

  public buildHeaders(): Record<string, string> {
    const headers: Record<string, string> = { Accept: 'application/json' };
    if (this.settings.access_token) {
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
}
