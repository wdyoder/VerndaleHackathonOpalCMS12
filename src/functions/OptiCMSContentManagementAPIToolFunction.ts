import { logger, Function, Response } from '@zaiusinc/app-sdk';
import { storage } from '@zaiusinc/app-sdk';

// Tool Endpoints
const DISCOVERY_ENDPOINT = '/discovery';
const HEALTH_ENDPOINT = '/health';
const GET_CONTENT_STRUCTURE_FROM_NODE_ENDPOINT = '/getContentStructureFromNode';
const CREATE_CONTENT_ENDPOINT = '/createContent';

// Define Opal tool metadata  - list of tools and their parameters
const discoveryPayload = {
  functions: [
    {
      name: 'content-structure-get',
      description:
        'Gets the content structure from the content with the provided content reference or unique identifier.',
      parameters: [
        {
          name: 'root',
          type: 'string',
          description: 'Content reference or unique identifier for the root node',
          required: true,
        },
      ],
      endpoint: GET_CONTENT_STRUCTURE_FROM_NODE_ENDPOINT,
      http_method: 'GET',
    },
    {
      name: 'content-create',
      description: 'Creates a new content item in Optimizely CMS.',
      parameters: [
        {
          name: 'payload',
          type: 'object',
          description:
            'Request body as defined by Optimizely CMS Content Management API. Example matches Postman screenshot.',
          required: true,
        },
        {
          name: 'status',
          type: 'string',
          description: "Optional draft status override (e.g., 'Published').",
          required: false,
        },
      ],
      endpoint: CREATE_CONTENT_ENDPOINT,
      http_method: 'POST',
    },
  ],
};

interface Credentials {
  cms_base_url: string;
  access_token?: string;
  basic_username?: string;
  basic_password?: string;
}

/**
 * class that implements the Opal tool functions. Requirements:
 * - Must extend the Function class from the SDK
 * - Name must match the value of entry_point property from app.yml manifest
 * - Name must match the file name
 */
export class OptiCMSContentManagementAPIToolFunction extends Function {
  /**
   * Processing the request from Opal
   * Add your logic here to handle every tool declared in the discoveryPayload.
   */
  public async perform(): Promise<Response> {
    if (this.request.path === DISCOVERY_ENDPOINT) {
      return new Response(200, discoveryPayload);
    }

    if (this.request.path === HEALTH_ENDPOINT) {
      return new Response(200, { status: 'healthy', tool: 'OptiCMSContentManagementAPITool' });
    }

    if (this.request.path === GET_CONTENT_STRUCTURE_FROM_NODE_ENDPOINT) {
      const params = this.extractParameters() as { root: string };
      const result = await this.getContentStructureFromNode(params);
      logger.info('response from getContentStructureFromNode: ', result);
      return new Response(200, result);
    }

    if (this.request.path === CREATE_CONTENT_ENDPOINT) {
      const params = this.extractParameters() as { payload: unknown; status?: string };
      const result = await this.createContent(params);
      logger.info('response from createContent: ', result);
      return new Response(200, result);
    }

    return new Response(400, 'Invalid path');
  }

  private extractParameters() {
    // Extract parameters from the request body
    if (this.request.bodyJSON && this.request.bodyJSON.parameters) {
      // Standard format: { "parameters": { ... } }
      logger.info("Extracted parameters from 'parameters' key:", this.request.bodyJSON.parameters);
      return this.request.bodyJSON.parameters;
    } else {
      // Fallback for direct testing: { "name": "value" }
      logger.warn("'parameters' key not found in request body. Using body directly.");
      return this.request.bodyJSON;
    }
  }

  /**
   * The logic of the tool goes here.
   */

  private async getContentStructureFromNode(parameters: { root: string }) {
    if (!parameters?.root) {
      throw new Error("Missing required parameter 'root'");
    }

    const credentials = (await storage.settings.get('auth').then((s) => s)) as Credentials;

    logger.info('calling get-content-structure-from-node...');

    const url = `${credentials.cms_base_url}/api/episerver/v3.0/contentstructure/${encodeURIComponent(
      parameters.root,
    )}`;

    const headers: Record<string, string> = {
      accept: 'application/json',
      'User-Agent': 'OpalCMS-App/1.0',
      'Accept-Language': 'en',
    };
    if (credentials.access_token) {
      headers.Authorization = `Bearer ${credentials.access_token}`;
    }

    const options = {
      method: 'GET',
      headers,
    } as const;

    logger.info('fetching URL: ', url);

    return fetch(url, options)
      .then((response) => {
        logger.info('response status: ', response.status);
        return response.json();
      })
      .then((data) => ({
        output_value: data,
      }))
      .catch((error) => {
        console.error('Error fetching data:', error);
        throw new Error('Failed to fetch content structure');
      });
  }

  private async createContent(parameters: { payload: unknown; status?: string }) {
    if (!parameters?.payload) {
      throw new Error("Missing required parameter 'payload'");
    }

    const credentials = (await storage.settings.get('auth').then((s) => s)) as Credentials;

    const url = `${credentials.cms_base_url}/api/episerver/v3.0/contentmanagement`;

    const headers: Record<string, string> = {
      accept: 'application/json',
      'Content-Type': 'application/json',
      'User-Agent': 'OpalCMS-App/1.0',
      'Accept-Language': 'en',
    };
    if (credentials.basic_username) {
      const token = Buffer.from(
        `${credentials.basic_username}:${credentials.basic_password ?? ''}`,
      ).toString('base64');
      headers.Authorization = `Basic ${token}`;
    } else if (credentials.access_token) {
      headers.Authorization = `Bearer ${credentials.access_token}`;
    }

    const options = {
      method: 'POST',
      headers,
      body: JSON.stringify(parameters.payload),
    } as const;

    logger.info('posting to URL: ', url);

    return fetch(url, options)
      .then((response) => {
        logger.info('response status: ', response.status);
        return response.json();
      })
      .then((data) => ({
        output_value: data,
      }))
      .catch((error) => {
        console.error('Error creating content:', error);
        throw new Error('Failed to create content');
      });
  }
}
