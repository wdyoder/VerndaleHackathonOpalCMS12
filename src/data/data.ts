import * as App from '@zaiusinc/app-sdk';
import { storage } from '@zaiusinc/app-sdk';

export interface CMSAuthSection extends App.ValueHash {
  cms_base_url?: string;
  cms_username?: string;
  cms_password_secret_key?: string; // e.g., "cms_basic_password"
  cms_cookie?: string;              // optional
  integrated?: boolean;
}


/** The shape we’ll save under storage.secrets */
type CMSPasswordSecret = { password: string };

/** Build the "Authorization: Basic xxxxx" header value */
export function makeBasicAuth(username: string, password: string): string {
  const creds = `${username}:${password}`;
  return `Basic ${Buffer.from(creds, 'utf8').toString('base64')}`;
}

/**
 * Thin wrapper for calling the CMS with Basic Auth.
 * - `pathOrUrl` can be a full URL or a path (we’ll join with base).
 * - `sectionKey` is the settings section id you use (defaults to "cmsAuth").
 */
export async function cmsFetch<T = unknown>(
  pathOrUrl: string,
  init: RequestInit = {},
  sectionKey = 'cmsAuth'
): Promise<T> {
  // 1) Read settings (safe for non-secret config)
  const cfg = await storage.settings.get<CMSAuthSection>(sectionKey);

  if (!cfg?.cms_base_url || !cfg?.cms_username || !cfg?.cms_password_secret_key) {
    throw new Error(
      'CMS auth not configured. Expect cms_base_url, cms_username, cms_password_secret_key in settings.'
    );
  }

  // 2) Read password from the OCP secrets store
  const secret = await storage.secrets.get<CMSPasswordSecret>(cfg.cms_password_secret_key);
  if (!secret?.password) throw new Error('CMS password not found in secrets store.');

  // 3) Build URL
  const url = pathOrUrl.startsWith('http')
    ? pathOrUrl
    : `${cfg.cms_base_url.replace(/\/+$/, '')}/${pathOrUrl.replace(/^\/+/, '')}`;

  // 4) Compose headers
  const headers = new Headers(init.headers || {});
  headers.set('Authorization', makeBasicAuth(cfg.cms_username, secret.password));
  headers.set('Accept', 'application/json');

  // If your CMS requires an auth cookie / antiforgery cookie, pass it via settings
  if (cfg.cms_cookie && !headers.has('Cookie')) headers.set('Cookie', cfg.cms_cookie);

  // 5) Fire the request (Node 18 runtime has global fetch)
  const res = await fetch(url, { ...init, headers });

  if (!res.ok) {
    const body = await res.text().catch(() => '');
    throw new Error(`CMS request failed: ${res.status} ${res.statusText}\n${body}`);
  }

  const ct = res.headers.get('content-type') || '';
  return ct.includes('application/json')
    ? ((await res.json()) as T)
    : ((await res.text()) as unknown as T);
}
