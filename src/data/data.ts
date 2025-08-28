import * as App from '@zaiusinc/app-sdk';

export interface CMSAuthSection extends App.ValueHash {
  cms_base_url?: string;
  basic_username?: string;
  basic_password?: string;
}
