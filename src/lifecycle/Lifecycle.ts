import {
  Lifecycle as AppLifecycle,
  AuthorizationGrantResult,
  LifecycleResult,
  LifecycleSettingsResult,
  logger,
  Request,
  storage,
  SubmittedFormData,
  functions,
} from '@zaiusinc/app-sdk';

export class Lifecycle extends AppLifecycle {
  public async onInstall(): Promise<LifecycleResult> {
    try {
      logger.info('Performing Install');
      // Populate instruction URLs with function discovery endpoints
      const endpoints = await functions.getEndpoints();
      await storage.settings.put('instructions', {
        opal_content_definitions_tool_url: endpoints.content_definitions
          ? `${endpoints.content_definitions}/discovery`
          : '',
        opal_content_management_tool_url: endpoints.content_definitions_content_types
          ? `${endpoints.content_definitions_content_types}/discovery`
          : '',
      });
      return { success: true };
    } catch (error: any) {
      logger.error('Error during installation:', error);
      return {
        success: false,
        retryable: true,
        message: `Error during installation: ${error}`,
      };
    }
  }

  public async onSettingsForm(
    section: string,
    action: string,
    formData: SubmittedFormData,
  ): Promise<LifecycleSettingsResult> {
    const result = new LifecycleSettingsResult();
    try {
      if (section === 'cms_api' && action === 'save_cms_api') {
        await storage.settings.put('cms_api', formData);

        const baseUrl = String((formData as any).base_url || '').replace(/\/$/, '');
        const testUrl = `${baseUrl}/api/episerver/v3.0/contenttypes?top=1`;
        const headers: Record<string, string> = { accept: 'application/json' };

        let ok = false;
        try {
          const res = await fetch(testUrl, { method: 'GET', headers });
          ok = res.ok;
        } catch {
          ok = false;
        }
        return ok
          ? result.addToast('success', 'Validation successful!')
          : result.addToast('warning', 'CMS endpoint did not respond OK. Check base URL.');
      }

      // Default behavior: save the form data to the settings store
      await storage.settings.put(section, formData);
      return result;
    } catch {
      return result.addToast(
        'danger',
        'Sorry, an unexpected error occurred. Please try again in a moment.',
      );
    }
  }

  public async onAuthorizationRequest(
    _section: string,
    _formData: SubmittedFormData,
  ): Promise<LifecycleSettingsResult> {
    // example: handling OAuth authorization request
    const result = new LifecycleSettingsResult();

    /* example: handling OAuth authorization request
    try {
      const url = new URL('https://accounts.google.com/o/oauth2/v2/auth');
      url.search = new URLSearchParams({
        client_id: process.env.APP_ENV_CLIENT_ID,
        response_type: 'code',
        access_type: 'offline',
        prompt: 'consent',
        scope: process.env.APP_ENV_SCOPE,
        redirect_uri: functions.getAuthorizationGrantUrl()
      } as any).toString();
      return result.redirect(url.toString());
    } catch (e) {
      return result.addToast(
        'danger',
        'Sorry, an unexpected error occurred. Please try again in a moment.',
      );
    }
    */

    return result.addToast('danger', 'Sorry, OAuth is not supported.');
  }

  public async onAuthorizationGrant(_request: Request): Promise<AuthorizationGrantResult> {
    // TODO: if your application supports the OAuth flow, evaluate the inbound request and perform any necessary action
    // to retrieve the access token, then forward the user to the next relevant settings form section:
    // `new AuthorizationGrantResult('my_next_section')`
    return new AuthorizationGrantResult('').addToast('danger', 'Sorry, OAuth is not supported.');
  }

  public async onUpgrade(_fromVersion: string): Promise<LifecycleResult> {
    // Refresh instruction URLs on upgrade
    const endpoints = await functions.getEndpoints();
    await storage.settings.put('instructions', {
      opal_content_definitions_tool_url: endpoints.content_definitions
        ? `${endpoints.content_definitions}/discovery`
        : '',
      opal_content_management_tool_url: endpoints.content_definitions_content_types
        ? `${endpoints.content_definitions_content_types}/discovery`
        : '',
    });
    return { success: true };
  }

  public async onFinalizeUpgrade(_fromVersion: string): Promise<LifecycleResult> {
    // TODO: any logic required when finalizing an upgrade from a previous version
    // At this point, new webhook URLs have been created for any new functions in this version
    return { success: true };
  }

  public async onAfterUpgrade(): Promise<LifecycleResult> {
    // TODO: any logic required after the upgrade has been completed.  This is the plugin point
    // for triggering one-time jobs against the upgraded installation
    return { success: true };
  }

  public async onUninstall(): Promise<LifecycleResult> {
    // TODO: any logic required to properly uninstall the app
    return { success: true };
  }
}
