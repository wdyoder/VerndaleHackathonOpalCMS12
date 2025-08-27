import { logger, Function, Response } from '@zaiusinc/app-sdk';
import { CmsClient } from '../shared/CmsClient';

const DISCOVERY_ENDPOINT = '/discovery';
const HEALTH_ENDPOINT = '/health';
const GET_CONTENT_TYPES_ENDPOINT = '/api/episerver/v3.0/contenttypes';
const GET_CONTENT_TYPE_BY_ID_ENDPOINT = '/api/episerver/v3.0/contenttypes/{id}';

type GetContentTypesParameters = Record<string, never>;
interface GetContentTypeByIdParameters {
  id: string;
}

const discoveryPayload = {
  functions: [
    {
      name: 'getContentTypes',
      description: 'List all content types in the system',
      parameters: [],
      endpoint: GET_CONTENT_TYPES_ENDPOINT,
      http_method: 'GET',
    },
    {
      name: 'getContentTypeById',
      description: 'Get a content type by its ID',
      parameters: [
        {
          name: 'id',
          type: 'string',
          required: true,
          description: 'The ID of the content type to retrieve',
        },
      ],
      endpoint: GET_CONTENT_TYPE_BY_ID_ENDPOINT,
      http_method: 'GET',
    },
  ],
};

export class OptiCMSContentManagementAPITool extends Function {
  public async perform(): Promise<Response> {
    if (this.request.path === DISCOVERY_ENDPOINT) {
      return new Response(200, discoveryPayload);
    }

    if (this.request.path === HEALTH_ENDPOINT) {
      return new Response(200, { status: 'healthy', tool: 'OptiCMSContentManagementAPITool' });
    }

    if (this.request.path === GET_CONTENT_TYPES_ENDPOINT) {
      const response = await this.getContentTypes({});
      return new Response(200, response);
    }

    if (this.request.path === GET_CONTENT_TYPE_BY_ID_ENDPOINT) {
      const params = this.extractParameters() as GetContentTypeByIdParameters;
      const response = await this.getContentTypeById(params);
      return new Response(200, response);
    }

    return new Response(400, 'Invalid path');
  }

  private extractParameters() {
    if (this.request.bodyJSON && this.request.bodyJSON.parameters) {
      logger.info("Extracted parameters from 'parameters' key:", this.request.bodyJSON.parameters);
      return this.request.bodyJSON.parameters;
    }
    logger.warn("'parameters' key not found in request body. Using body directly.");
    return this.request.bodyJSON;
  }

  private async getClient(): Promise<CmsClient> {
    return CmsClient.create();
  }

  private async getContentTypes(_parameters: GetContentTypesParameters) {
    const client = await this.getClient();
    const result = await client.getJson('contenttypes');
    if (!result.ok) {
      logger.error('Content types list failed', { status: result.status, body: result.errorText });
      return { success: false, status: result.status, error: result.errorText };
    }
    return { success: true, data: result.data };
  }

  private async getContentTypeById(parameters: GetContentTypeByIdParameters) {
    if (!parameters?.id || typeof parameters.id !== 'string') {
      return { success: false, status: 400, error: "Missing required parameter 'id'" };
    }
    const client = await this.getClient();
    const result = await client.getJson(`contenttypes/${encodeURIComponent(parameters.id)}`);
    if (!result.ok) {
      logger.error('Content type get failed', { status: result.status, body: result.errorText });
      return { success: false, status: result.status, error: result.errorText };
    }
    return { success: true, data: result.data };
  }
}
