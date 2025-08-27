import { logger, Function, Response } from '@zaiusinc/app-sdk';
import { storage } from '@zaiusinc/app-sdk';

// constants
const DISCOVERY_ENDPOINT = '/discovery';
const LIST_LANGUAGE_BRANCHES_ENDPOINT = '/api/episerver/v3.0/languagebranches';
const GET_LANGUAGE_BRANCH_BY_NAME_ENDPOINT = '/api/episerver/v3.0/languagebranches/{name}';

// parameters
interface GetLanguageBranchByNameParameters {
  name: string;
}

interface Credentials {
  cms_base_url: string;
}

// Opal tool metadata
const discoveryPayload = {
  functions: [
    {
      name: 'listLanguageBranches',
      description: 'List all language branch definitions in Optimizely CMS.',
      parameters: [],
      endpoint: LIST_LANGUAGE_BRANCHES_ENDPOINT,
      http_method: 'GET'
    },
    {
      name: 'getLanguageBranchByName',
      description: 'Get a specific language branch definition by its name.',
      parameters: [
        {
          name: 'name',
          type: 'string',
          required: true,
          description: 'The language branch name to retrieve (for example, en, sv).'
        }
      ],
      endpoint: GET_LANGUAGE_BRANCH_BY_NAME_ENDPOINT,
      http_method: 'GET'
    }
  ]
};

export class LanguageBranchesFunction extends Function {
  public async perform(): Promise<Response> {
    if (this.request.path === DISCOVERY_ENDPOINT) {
      return new Response(200, discoveryPayload);
    }

    if (this.request.path === LIST_LANGUAGE_BRANCHES_ENDPOINT) {
      const credentials = await this.getCredentials();
      const response = await this.listLanguageBranches(credentials);
      return new Response(200, response);
    }

    if (this.request.path === GET_LANGUAGE_BRANCH_BY_NAME_ENDPOINT) {
      const params = this.extractParameters() as GetLanguageBranchByNameParameters;
      const credentials = await this.getCredentials();
      const response = await this.getLanguageBranchByName(params, credentials);
      return new Response(200, response);
    }

    return new Response(400, 'Invalid path');
  }

  private extractParameters() {
    if (this.request.bodyJSON && this.request.bodyJSON.parameters) {
      logger.info(
        "Extracted parameters from 'parameters' key:",
        this.request.bodyJSON.parameters
      );
      return this.request.bodyJSON.parameters;
    }

    logger.warn("'parameters' key not found in request body. Using body directly.");
    return this.request.bodyJSON;
  }

  private async getCredentials(): Promise<Credentials> {
    const settings = (await storage.settings.get('auth').then((s) => s)) as Credentials;
    if (!settings || !settings.cms_base_url) {
      throw new Error('Missing CMS base URL in settings (auth.cms_base_url).');
    }
    return settings;
  }

  private async listLanguageBranches(credentials: Credentials) {
    const url = `${credentials.cms_base_url}${LIST_LANGUAGE_BRANCHES_ENDPOINT}`;
    const options = {
      method: 'GET',
      headers: {
        accept: 'application/json'
      }
    } as const;

    try {
      const response = await fetch(url, options);
      if (!response.ok) {
        const body = await response.text();
        throw new Error(`Failed to list language branches: ${response.status} ${body}`);
      }
      const data = await response.json();
      return { output_value: data };
    } catch (error) {
      logger.error('Error fetching language branches:', error);
      throw error;
    }
  }

  private async getLanguageBranchByName(
    parameters: GetLanguageBranchByNameParameters,
    credentials: Credentials
  ) {
    const base = `${credentials.cms_base_url}${GET_LANGUAGE_BRANCH_BY_NAME_ENDPOINT}`;
    const url = `${base}/${encodeURIComponent(parameters.name)}`;
    const options = {
      method: 'GET',
      headers: {
        accept: 'application/json'
      }
    } as const;

    try {
      const response = await fetch(url, options);
      if (!response.ok) {
        const body = await response.text();
        throw new Error(
          `Failed to get language branch '${parameters.name}': ${response.status} ${body}`
        );
      }
      const data = await response.json();
      return { output_value: data };
    } catch (error) {
      logger.error('Error fetching language branch by name:', error);
      throw error;
    }
  }
}


