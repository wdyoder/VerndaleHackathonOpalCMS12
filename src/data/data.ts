import * as App from '@zaiusinc/app-sdk';
import { storage } from '@zaiusinc/app-sdk';

export interface CMSAuthSection extends App.ValueHash {
  cms_base_url?: string;
  cms_cd_client_id?: string;
  cms_cm_client_id?: string;
  contentDeliverySecretKey?: string;
  contentManagementSecretKey?: string;
}

/** The shape we’ll save under storage.secrets */
export interface SecretPassword extends App.ValueHash {
  password: string;
}

export async function getSettings(): Promise<CMSAuthSection> {
  return storage.settings.get<CMSAuthSection>('auth');
}
export async function getCDSecret(): Promise<string | undefined> {
  const settings = await getSettings();
  const secret = await storage.secrets.get<SecretPassword>(settings.contentDeliverySecretKey || '');
  return secret?.password;
}
export async function getCMSecret(): Promise<string | undefined> {
  const settings = await getSettings();
  const secret = await storage.secrets.get<SecretPassword>(settings.contentManagementSecretKey || '');
  return secret?.password;
}
