import { logger, Function, Response } from '@zaiusinc/app-sdk';
import { CmsContentManagementClient } from '../shared/CmsContentManagementClient';

// Tool Endpoints
const DISCOVERY_ENDPOINT = '/discovery';
const HEALTH_ENDPOINT = '/health';
const DELETE_CONTENT_ENDPOINT = '/deleteContent';
const GET_CONTENT_ENDPOINT = '/getContent';
const UPDATE_MEDIA_CONTENT_ENDPOINT = '/updateMediaContent';
const MOVE_CONTENT_ENDPOINT = '/moveContent';
const CREATE_CONTENT_ENDPOINT = '/createContent';
const CREATE_OR_UPDATE_MEDIA_CONTENT_ENDPOINT = '/createOrUpdateMediaContent';
const GET_CONTENT_STRUCTURE_ENDPOINT = '/getContentStructure';
const GET_CONTENT_STRUCTURE_FROM_NODE_ENDPOINT = '/getContentStructureFromNode';

// Define interfaces for the parameters of each function
interface DeleteContentParams {
  contentIdentifier: string;
}
interface GetContentParams {
  contentIdentifier: string;
  acceptLanguage?: string;
}
interface UpdateMediaContentParams {
  contentIdentifier: string;
  fileName: string;
  contentType: string;
  /** Base64-encoded file bytes */
  dataBase64: string;
}
interface ParentLink {
  id?: number;
  workId?: string;
  guidValue?: string;
  providerName?: string;
}
interface MoveContentParams {
  contentIdentifier: string;
  parentLink: ParentLink;
}
interface CreateContentParams {
  /** Content JSON body to post */
  content: unknown;
}
interface CreateOrUpdateMediaContentParams {
  /** Content JSON body to send as multipart part named 'content' */
  content: unknown;
  /** Base64-encoded file bytes for the media */
  fileBase64: string;
  /** File name for the media binary */
  fileName: string;
  /** MIME type for the media binary */
  contentType: string;
}

// Define Opal tool metadata  - list of tools and their parameters
const discoveryPayload = {
  functions: [
    {
      name: 'content-management-delete',
      description: 'Deletes a content by content reference or unique identifier.',
      parameters: [
        {
          name: 'contentIdentifier',
          type: 'string',
          description: 'Content reference or GUID',
          required: true,
        },
      ],
      endpoint: DELETE_CONTENT_ENDPOINT,
      http_method: 'DELETE',
    },
    {
      name: 'content-management-get',
      description:
        'Gets the content draft by given content reference or unique identifier and language.',
      parameters: [
        {
          name: 'contentIdentifier',
          type: 'string',
          description: 'Content reference or GUID',
          required: true,
        },
        {
          name: 'acceptLanguage',
          type: 'string',
          description: 'Optional Accept-Language header',
          required: false,
        },
      ],
      endpoint: GET_CONTENT_ENDPOINT,
      http_method: 'GET',
    },
    {
      name: 'content-management-update-media',
      description:
        'Updates the specified content media item by content reference or unique identifier (binary PATCH).',
      parameters: [
        {
          name: 'contentIdentifier',
          type: 'string',
          description: 'Content reference or GUID',
          required: true,
        },
        {
          name: 'fileName',
          type: 'string',
          description: 'File name for the upload',
          required: true,
        },
        {
          name: 'contentType',
          type: 'string',
          description: 'MIME type of the binary',
          required: true,
        },
        {
          name: 'dataBase64',
          type: 'string',
          description: 'Base64-encoded file bytes',
          required: true,
        },
      ],
      endpoint: UPDATE_MEDIA_CONTENT_ENDPOINT,
      http_method: 'PATCH',
    },
    {
      name: 'content-management-move',
      description: 'Moves a content from its current location to another location.',
      parameters: [
        {
          name: 'contentIdentifier',
          type: 'string',
          description: 'Content reference or GUID',
          required: true,
        },
        {
          name: 'parentLink',
          type: 'object',
          description: 'New parentLink identifier',
          required: true,
        },
      ],
      endpoint: MOVE_CONTENT_ENDPOINT,
      http_method: 'POST',
    },
    {
      name: 'content-management-create',
      description: 'Creates a new content item.',
      parameters: [
        { name: 'content', type: 'object', description: 'Content JSON', required: true },
      ],
      endpoint: CREATE_CONTENT_ENDPOINT,
      http_method: 'POST',
    },
    {
      name: 'content-management-create-or-update-media',
      description:
        'Creates or updates media content via multipart/form-data with content JSON + binary.',
      parameters: [
        { name: 'content', type: 'object', description: 'Content JSON', required: true },
        {
          name: 'fileBase64',
          type: 'string',
          description: 'Base64-encoded file bytes',
          required: true,
        },
        {
          name: 'fileName',
          type: 'string',
          description: 'File name for the upload',
          required: true,
        },
        {
          name: 'contentType',
          type: 'string',
          description: 'MIME type of the binary',
          required: true,
        },
      ],
      endpoint: CREATE_OR_UPDATE_MEDIA_CONTENT_ENDPOINT,
      http_method: 'PUT',
    },
    {
      name: 'content-structure-get-root',
      description: 'Endpoint that will redirect to the global root node.',
      parameters: [],
      endpoint: GET_CONTENT_STRUCTURE_ENDPOINT,
      http_method: 'GET',
    },
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
  ],
};

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

    if (this.request.path === DELETE_CONTENT_ENDPOINT) {
      const params = this.extractParameters() as DeleteContentParams;
      const result = await this.deleteContent(params);
      return new Response(result.status, result.body);
    }

    if (this.request.path === GET_CONTENT_ENDPOINT) {
      const params = this.extractParameters() as GetContentParams;
      const result = await this.getContent(params);
      return new Response(result.status, result.body);
    }

    if (this.request.path === UPDATE_MEDIA_CONTENT_ENDPOINT) {
      const params = this.extractParameters() as UpdateMediaContentParams;
      const result = await this.updateMediaContent(params);
      return new Response(result.status, result.body);
    }

    if (this.request.path === MOVE_CONTENT_ENDPOINT) {
      const params = this.extractParameters() as MoveContentParams;
      const result = await this.moveContent(params);
      return new Response(result.status, result.body);
    }

    if (this.request.path === CREATE_CONTENT_ENDPOINT) {
      const params = this.extractParameters() as CreateContentParams;
      const result = await this.createContent(params);
      return new Response(result.status, result.body);
    }

    if (this.request.path === CREATE_OR_UPDATE_MEDIA_CONTENT_ENDPOINT) {
      const params = this.extractParameters() as CreateOrUpdateMediaContentParams;
      const result = await this.createOrUpdateMediaContent(params);
      return new Response(result.status, result.body);
    }

    if (this.request.path === GET_CONTENT_STRUCTURE_ENDPOINT) {
      const result = await this.getContentStructureRoot();
      return new Response(result.status, result.body);
    }

    if (this.request.path === GET_CONTENT_STRUCTURE_FROM_NODE_ENDPOINT) {
      const params = this.extractParameters() as { root: string };
      const result = await this.getContentStructureFromNode(params);
      return new Response(result.status, result.body);
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

  private async getClient(): Promise<CmsContentManagementClient> {
    return CmsContentManagementClient.create();
  }

  private buildManagementUrl(client: CmsContentManagementClient, path: string): string {
    const root = client.buildRoot();
    return `${root}/contentmanagement/${path}`.replace(/\/{2,}/g, '/');
  }

  private async deleteContent(
    params: DeleteContentParams,
  ): Promise<{ status: number; body: unknown }> {
    if (!params?.contentIdentifier) {
      return { status: 400, body: { message: "Missing required parameter 'contentIdentifier'" } };
    }
    const client = await this.getClient();
    const url = this.buildManagementUrl(client, encodeURIComponent(params.contentIdentifier));
    const resp = await fetch(url, { method: 'DELETE', headers: client.buildHeaders() });
    const body = await (resp.headers.get('content-type')?.includes('application/json')
      ? resp.json()
      : resp.text());
    return { status: resp.status, body };
  }

  private async getContent(params: GetContentParams): Promise<{ status: number; body: unknown }> {
    if (!params?.contentIdentifier) {
      return { status: 400, body: { message: "Missing required parameter 'contentIdentifier'" } };
    }
    const client = await this.getClient();
    const headers = client.buildHeaders();
    if (params.acceptLanguage) {
      headers['Accept-Language'] = params.acceptLanguage;
    }
    const url = this.buildManagementUrl(client, encodeURIComponent(params.contentIdentifier));
    const resp = await fetch(url, { method: 'GET', headers });
    const body = await (resp.headers.get('content-type')?.includes('application/json')
      ? resp.json()
      : resp.text());
    return { status: resp.status, body };
  }

  private async updateMediaContent(
    params: UpdateMediaContentParams,
  ): Promise<{ status: number; body: unknown }> {
    const missing = ['contentIdentifier', 'fileName', 'contentType', 'dataBase64'].filter(
      (k) => !(params as any)?.[k],
    );
    if (missing.length) {
      return {
        status: 400,
        body: { message: `Missing required parameter(s): ${missing.join(', ')}` },
      };
    }
    const client = await this.getClient();
    const url = this.buildManagementUrl(client, encodeURIComponent(params.contentIdentifier));
    const headers = client.buildHeaders();
    headers['Content-Type'] = params.contentType;
    headers['Content-Disposition'] = `attachment; filename="${params.fileName}"`;
    const body = Buffer.from(params.dataBase64, 'base64');
    const resp = await fetch(url, { method: 'PATCH', headers, body });
    const respBody = await (resp.headers.get('content-type')?.includes('application/json')
      ? resp.json()
      : resp.text());
    return { status: resp.status, body: respBody };
  }

  private async moveContent(params: MoveContentParams): Promise<{ status: number; body: unknown }> {
    if (!params?.contentIdentifier || !params?.parentLink) {
      return {
        status: 400,
        body: { message: "Missing required parameters 'contentIdentifier' or 'parentLink'" },
      };
    }
    const client = await this.getClient();
    const url = this.buildManagementUrl(
      client,
      `${encodeURIComponent(params.contentIdentifier)}/move`,
    );
    const headers = { ...client.buildHeaders(), 'Content-Type': 'application/json' };
    const resp = await fetch(url, {
      method: 'POST',
      headers,
      body: JSON.stringify({ parentLink: params.parentLink }),
    });
    const body = await (resp.headers.get('content-type')?.includes('application/json')
      ? resp.json()
      : resp.text());
    return { status: resp.status, body };
  }

  private async createContent(
    params: CreateContentParams,
  ): Promise<{ status: number; body: unknown }> {
    if (params?.content === undefined) {
      return { status: 400, body: { message: "Missing required parameter 'content'" } };
    }
    const client = await this.getClient();
    const url = this.buildManagementUrl(client, '');
    const headers = { ...client.buildHeaders(), 'Content-Type': 'application/json' };
    const resp = await fetch(url, {
      method: 'POST',
      headers,
      body: JSON.stringify(params.content),
    });
    const body = await (resp.headers.get('content-type')?.includes('application/json')
      ? resp.json()
      : resp.text());
    return { status: resp.status, body };
  }

  private async createOrUpdateMediaContent(
    params: CreateOrUpdateMediaContentParams,
  ): Promise<{ status: number; body: unknown }> {
    const missing = ['content', 'fileBase64', 'fileName', 'contentType'].filter(
      (k) => !(params as any)?.[k],
    );
    if (missing.length) {
      return {
        status: 400,
        body: { message: `Missing required parameter(s): ${missing.join(', ')}` },
      };
    }
    const client = await this.getClient();
    const url = this.buildManagementUrl(client, '');

    // Manually build multipart/form-data body to avoid DOM lib dependency
    const boundary = `----opalcms-${Math.random().toString(36).slice(2)}`;
    const headers = {
      ...client.buildHeaders(),
      'Content-Type': `multipart/form-data; boundary=${boundary}`,
    };

    const jsonPart = Buffer.from(
      `--${boundary}\r\nContent-Disposition: form-data; name="content"\r\nContent-Type: application/json\r\n\r\n${JSON.stringify(
        params.content,
      )}\r\n`,
    );
    const binaryHeader = Buffer.from(
      `--${boundary}\r\nContent-Disposition: form-data; name="binary"; filename="${params.fileName}"\r\nContent-Type: ${params.contentType}\r\n\r\n`,
    );
    const binaryBody = Buffer.from(params.fileBase64, 'base64');
    const closing = Buffer.from(`\r\n--${boundary}--\r\n`);
    const body = Buffer.concat([jsonPart, binaryHeader, binaryBody, closing]);

    const resp = await fetch(url, { method: 'PUT', headers, body });
    const respBody = await (resp.headers.get('content-type')?.includes('application/json')
      ? resp.json()
      : resp.text());
    return { status: resp.status, body: respBody };
  }

  private async getContentStructureRoot(): Promise<{ status: number; body: unknown }> {
    const client = await this.getClient();
    const url = `${client.buildRoot()}/contentstructure`.replace(/\/{2,}/g, '/');
    const resp = await fetch(url, { method: 'GET', headers: client.buildHeaders() });
    const body = await (resp.headers.get('content-type')?.includes('application/json')
      ? resp.json()
      : resp.text());
    return { status: resp.status, body };
  }

  private async getContentStructureFromNode(params: {
    root: string;
  }): Promise<{ status: number; body: unknown }> {
    if (!params?.root) {
      return { status: 400, body: { message: "Missing required parameter 'root'" } };
    }
    const client = await this.getClient();
    const url = `${client.buildRoot()}/contentstructure/${encodeURIComponent(params.root)}`.replace(
      /\/{2,}/g,
      '/',
    );
    const resp = await fetch(url, { method: 'GET', headers: client.buildHeaders() });
    const body = await (resp.headers.get('content-type')?.includes('application/json')
      ? resp.json()
      : resp.text());
    return { status: resp.status, body };
  }
}
