import { CMSAuthSection, getCMSecret, getSettings } from '../data/data';

export class CmsContentManagementClient {
  private readonly settings: CMSAuthSection;

  private constructor(settings: CMSAuthSection) {
    this.settings = settings;
  }

  public static async create(): Promise<CmsContentManagementClient> {
    const settings = await getSettings();
    if (!settings || typeof settings.cms_base_url !== 'string') {
      throw new Error('CMS API settings are missing. Please configure cms_base_url in settings.');
    }
    return new CmsContentManagementClient(settings);
  }

  public buildRoot(): string {
    const baseUrl = this.settings.cms_base_url ?? '';
    const base = baseUrl.replace(/\/$/, '');
    return `${base}/api/episerver/v3.0`.replace(/\/{2,}/g, '/').replace(':/', '://');
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
  /** Build the "Authorization: Basic xxxxx" header value */
  public async buildBasicAuth(): Promise<string> {
    const username = this.settings.cms_cm_client_id;
    const cm_key = await getCMSecret();
    const creds = `${username}:${cm_key}`;
    return `Basic ${Buffer.from(creds, 'utf8').toString('base64')}`;
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
    const headers = await this.buildHeaders();
    const resp = await fetch(url.toString(), { method: 'GET', headers });
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
