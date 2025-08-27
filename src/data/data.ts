import * as App from '@zaiusinc/app-sdk';

export interface CMSAuthSection extends App.ValueHash {
  cms_base_url?: string;
  cms_client_id?: string;
  cms_api_key?: string;
}
