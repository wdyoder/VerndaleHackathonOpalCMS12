import { logger, Function, Response } from '@zaiusinc/app-sdk';
import { CmsClient } from '../shared/CmsClient';

const DISCOVERY_ENDPOINT = '/discovery';
const HEALTH_ENDPOINT = '/health';

// Settings and HTTP handled by CmsClient

interface ListPropertyDataTypesParams {
  page?: number;
  pageSize?: number;
}

interface GetPropertyGroupsParams {
  contentTypeId?: string;
  [key: string]: unknown;
}

interface GetPropertyGroupByNameParams {
  name: string;
}

//

const discoveryPayload = {
  functions: [
    {
      name: 'content-definitions-property-data-types-list',
      description: 'List available property data types from the Optimizely Content Definitions API',
      parameters: [
        { name: 'page', type: 'number', description: 'Optional page number', required: false },
        { name: 'pageSize', type: 'number', description: 'Optional page size', required: false },
      ],
      endpoint: '/tools/content-definitions/property-data-types/list',
      http_method: 'POST',
    },
    {
      name: 'content-definitions-property-groups-list',
      description: 'List all property groups; optional query params are passed through',
      parameters: [
        {
          name: 'contentTypeId',
          type: 'string',
          description: 'Optional content type identifier',
          required: false,
        },
      ],
      endpoint: '/tools/content-definitions/property-groups/list',
      http_method: 'POST',
    },
    {
      name: 'content-definitions-property-groups-get',
      description: 'Get a property group by name',
      parameters: [
        { name: 'name', type: 'string', description: 'Property group name', required: true },
      ],
      endpoint: '/tools/content-definitions/property-groups/get',
      http_method: 'POST',
    },
  ],
};

export class OptiCMSContentDefinitionsAPITool extends Function {
  public async perform(): Promise<Response> {
    if (this.request.path === DISCOVERY_ENDPOINT) {
      return new Response(200, discoveryPayload);
    }

    if (this.request.path === HEALTH_ENDPOINT) {
      return new Response(200, { status: 'healthy', tool: 'OptiCMSContentDefinitionsAPITool' });
    }

    if (this.request.path === '/tools/content-definitions/property-data-types/list') {
      const params = this.extractParameters<ListPropertyDataTypesParams>();
      const json = await this.handleListPropertyDataTypes(params);
      return new Response(200, json);
    }

    if (this.request.path === '/tools/content-definitions/property-groups/list') {
      const params = this.extractParameters<GetPropertyGroupsParams>();
      const json = await this.handleGetPropertyGroups(params);
      return new Response(200, json);
    }

    if (this.request.path === '/tools/content-definitions/property-groups/get') {
      const params = this.extractParameters<GetPropertyGroupByNameParams>();
      const json = await this.handleGetPropertyGroupByName(params);
      return new Response(200, json);
    }

    return new Response(400, 'Invalid path');
  }

  private extractParameters<TParam>(): TParam {
    const body = this.request.bodyJSON;
    if (body && body.parameters) {
      logger.info("Using 'parameters' payload shape for tool invocation");
      return body.parameters as TParam;
    }
    if (body && body.arguments) {
      logger.info("Using 'arguments' payload shape for tool invocation");
      return body.arguments as TParam;
    }
    logger.warn('Falling back to raw body for tool invocation parameters');
    return body as TParam;
  }

  private async getClient(): Promise<CmsClient> {
    return CmsClient.create();
  }

  private async handleListPropertyDataTypes(params: ListPropertyDataTypesParams) {
    const client = await this.getClient();
    const query: Record<string, string> = {};
    if (params?.page) query.page = String(params.page);
    if (params?.pageSize) query.pageSize = String(params.pageSize);
    const result = await client.getJson('propertydatatypes', query);
    if (!result.ok) {
      logger.error('Property data types list failed', {
        status: result.status,
        body: result.errorText,
      });
      return { success: false, status: result.status, error: result.errorText };
    }
    return { success: true, data: result.data };
  }

  private async handleGetPropertyGroups(params: GetPropertyGroupsParams) {
    const client = await this.getClient();
    const query: Record<string, string> = {};
    if (params) {
      Object.entries(params).forEach(([k, v]) => {
        if (v !== undefined && v !== null) query[k] = String(v as any);
      });
    }
    const result = await client.getJson('propertygroups', query);
    if (!result.ok) {
      logger.error('Property groups get failed', { status: result.status, body: result.errorText });
      return { success: false, status: result.status, error: result.errorText };
    }
    return { success: true, data: result.data };
  }

  private async handleGetPropertyGroupByName(params: GetPropertyGroupByNameParams) {
    if (!params?.name || typeof params.name !== 'string') {
      return { success: false, status: 400, error: "Missing required parameter 'name'" };
    }
    const client = await this.getClient();
    const result = await client.getJson(`propertygroups/${encodeURIComponent(params.name)}`);
    if (!result.ok) {
      logger.error('Property group get-by-name failed', {
        status: result.status,
        body: result.errorText,
      });
      return { success: false, status: result.status, error: result.errorText };
    }
    return { success: true, data: result.data };
  }
}
