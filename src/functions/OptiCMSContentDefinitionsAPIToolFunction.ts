/* eslint-disable max-len */
import { logger, Function, Response } from '@zaiusinc/app-sdk';
import { storage } from '@zaiusinc/app-sdk';
import { CmsClient } from '../shared/CmsClient';

// Tool Endpoints
const DISCOVERY_ENDPOINT = '/discovery';
const HEALTH_ENDPOINT = '/health';
const GET_CONTENT_TYPES_ENDPOINT = '/getContentTypes';
const GET_CONTENT_TYPE_BY_ID_ENDPOINT = '/getContentTypeById';
const LIST_LANGUAGE_BRANCHES_ENDPOINT = '/getLanguageBranches';
const GET_LANGUAGE_BRANCH_BY_NAME_ENDPOINT = '/getLanguageBranchByName';
const LIST_EDITOR_DEFINITIONS_ENDPOINT = '/getEditorDefinitions';
const GET_EDITOR_DEFINITION_BY_TYPE_AND_UIHINT_ENDPOINT = '/getEditorDefinitionByTypeAndUiHint/';
// Opti API Endpoints
const OPTIMIZELY_EDITORS_API_ENDPOINT = '/api/episerver/v3.0/editors';

// defines parameters interfaces (ContentTypes)
// eslint-disable-next-line @typescript-eslint/no-empty-object-type, @typescript-eslint/no-empty-interface
interface GetContentTypesParameter {
  // am*** not implemented because this parameter is optional,
  //  and will provide an x-epi-continuation token to get next batch of content-types
  // top: number;
  // am*** not implemented because this parameter is optional, and not documented in the documentation
  //  includeSystemTypes: boolean;
}

// defines parameters interfaces (ContentTypeById)
interface GetContentTypeByIdParameter {
  id: string;
}

interface GetLanguageBranchByNameParameters {
  name: string;
}

interface Credentials {
  cms_base_url: string;
}

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

/** Editor Definitions (GET) */
interface ListEditorDefinitionsParameters {
  /** Optional filter on DataType via query string */
  typeFilter?: string;
}

interface GetEditorDefinitionParameters {
  /** The type for an editor definition (path segment) */
  dataType: string;
  /** The UIHint for an editor definition (path segment) */
  uiHint: string;
}

// Define Opal tool metadata  - list of tools and their parameters
const discoveryPayload = {
  functions: [
    {
      'name': 'verndale_get_content_types',
      'description': 'List all of the content types that are found by the CMS content definitions API.',
      'parameters': [
      ],
      'endpoint': GET_CONTENT_TYPES_ENDPOINT,
      'http_method': 'GET'
    },
    {
      'name': 'verndale_get_content_type_by_id',

      'description': 'Get all the details about a specific content type by its ID using the CMS content definitions API.',  // am*** maybe include example of the response
      'parameters': [
        {
          'name': 'id',
          'type': 'string',
          'required': true,
          'description': 'The ID of the content type to retrieve from the CMS'
        }
      ],
      'endpoint': GET_CONTENT_TYPE_BY_ID_ENDPOINT,
      'http_method': 'GET'
    },
    {
      name: 'verndale_get_language_branches',
      description: 'List all language branch definitions in the system.',
      parameters: [],
      endpoint: LIST_LANGUAGE_BRANCHES_ENDPOINT,
      http_method: 'GET'
    },
    {
      name: 'verndale_get_language_branch_by_name',
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
    },
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
    // === Editor Definitions: List (GET) ===
    {
      'name': 'verndale_list_editor_definitions',
      'description':
        'List available editor definitions in Optimizely Content Definitions. Use this when you need to discover which editor is associated with a given content data type, or to show all available editors the CMS exposes.',
      'parameters': [
        {
          'name': 'typeFilter',
          'type': 'string',
          'description': 'Optional filter on DataType (query string).',
          'required': false
        }
      ],
      'endpoint': LIST_EDITOR_DEFINITIONS_ENDPOINT,
      'http_method': 'GET'
    },

    // === Editor Definitions: Get by type + uiHint (GET) ===
    {
      'name': 'verndale_get_editor_definition',
      'description':
        'Retrieve a single editor definition by content data type and UI hint. Use this when you already know the dataType and uiHint and need the exact editor implementation.',
      'parameters': [
        {
          'name': 'dataType',
          'type': 'string',
          'description': 'The type for an editor definition (path parameter).',
          'required': true
        },
        {
          'name': 'uiHint',
          'type': 'string',
          'description': 'The UIHint for an editor definition (path parameter).',
          'required': true
        }
      ],
      'endpoint': GET_EDITOR_DEFINITION_BY_TYPE_AND_UIHINT_ENDPOINT,
      'http_method': 'GET'
    }
  ]
};


/**
 * class that implements the Opal tool functions. Requirements:
 * - Must extend the Function class from the SDK
 * - Name must match the value of entry_point property from app.yml manifest
 * - Name must match the file name
 */
export class OptiCMSContentDefinitionsAPIToolFunction extends Function {

  public async perform(): Promise<Response> {

    if (this.request.path === DISCOVERY_ENDPOINT) {
      return new Response(200, discoveryPayload);
    }

    if (this.request.path === GET_CONTENT_TYPES_ENDPOINT) {
      const params = this.extractParameters() as GetContentTypesParameter;
      // am*** need to extract to a function
      const credentials = await storage.settings.get('auth').then((s) => s) as Credentials;
      const response =  await this.getContentTypes(params, credentials);

      logger.info('response from getContentTypes: ', response);

      return new Response(200, response);
    }

    if (this.request.path === GET_CONTENT_TYPE_BY_ID_ENDPOINT) {
      const params = this.extractParameters() as GetContentTypeByIdParameter;
      // am*** need to extract to a function
      const credentials = await storage.settings.get('auth').then((s) => s) as Credentials;
      const response =  await this.getContentTypeById(params, credentials);

      logger.info('response from getContentTypeById: ', response);

      return new Response(200, response);
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

    if (this.request.path === HEALTH_ENDPOINT) {
      return new Response(200, { status: 'healthy', tool: 'OptiCMSContentDefinitionsAPITool' });
    }

    if (this.request.path === '/tools/content-definitions/property-data-types/list') {
      const params = this.extractParameters() as ListPropertyDataTypesParams;
      const json = await this.handleListPropertyDataTypes(params);
      return new Response(200, json);
    }

    if (this.request.path === '/tools/content-definitions/property-groups/list') {
      const params = this.extractParameters() as GetPropertyGroupsParams;
      const json = await this.handleGetPropertyGroups(params);
      return new Response(200, json);
    }

    if (this.request.path === '/tools/content-definitions/property-groups/get') {
      const params = this.extractParameters() as GetPropertyGroupByNameParams;
      const json = await this.handleGetPropertyGroupByName(params);
      return new Response(200, json);
    }

    if (this.request.path === LIST_EDITOR_DEFINITIONS_ENDPOINT) {
      const params = this.extractParameters() as ListEditorDefinitionsParameters;
      const credentials = await storage.settings.get('auth').then((s) => s) as Credentials;
      const response = await this.listEditorDefinitionsHandler(params, credentials);

      logger.info('response from listEditorDefinitionsHandler: ', response);

      return new Response(200, response);
    }

    if (this.request.path === GET_EDITOR_DEFINITION_BY_TYPE_AND_UIHINT_ENDPOINT) {
      // Expected: /content-definitions/editors/{dataType}/{uiHint}
      const segments = this.request.path.split('/').filter(Boolean);
      const dataType = segments[2];
      const uiHint = segments[3];

      if (!dataType || !uiHint) {
        return new Response(400, {
          message: 'Missing dataType or uiHint in path. Expected /content-definitions/editors/{dataType}/{uiHint}'
        });
      }

      const params = { dataType, uiHint };
      const credentials = await storage.settings.get('auth').then((s) => s) as Credentials;
      const response = await this.getEditorDefinitionHandler(params, credentials);

      logger.info('response from getEditorDefinitionHandler: ', response);

      if (!response) {
        return new Response(404, { message: 'Editor definition not found' });
      }
      return new Response(200, response);
    }


    return new Response(400, 'Invalid path');
  }

  private extractParameters() {
    // Extract parameters from the request body
    if (this.request.bodyJSON && this.request.bodyJSON.parameters) {
      // Standard format: { "parameters": { ... } }
      logger.info("Extracted parameters from 'parameters' key:", this.request.bodyJSON.parameters);
      return this.request.bodyJSON.parameters;
    }

    // Fallback for direct testing: { "name": "value" }
    logger.warn('\'parameters\' key not found in request body. Using body directly.');
    return this.request.bodyJSON;
  }

  private async getClient(): Promise<CmsClient> {
    return CmsClient.create();
  }

  /**
   * The logic of the tool goes here.
   */

  private async getCredentials(): Promise<Credentials> {
    const settings = (await storage.settings.get('auth').then((s) => s)) as Credentials;
    if (!settings || !settings.cms_base_url) {
      throw new Error('Missing CMS base URL in settings (auth.cms_base_url).');
    }
    return settings;
  }

  private async getContentTypes(parameters: GetContentTypesParameter, credentials: Credentials) {

    logger.info('calling get-content-types...');

    const options = {
      method: 'GET',
      headers: {
        accept: 'application/json',
      }
    };

    return fetch(`${credentials.cms_base_url}/api/episerver/v3.0/contenttypes`, options)
      .then((response) => {
        logger.info('response status: ', response.status);
        return response.json();
      })
      .then((data) => ({
        output_value: data
      }))
      .catch((error) => {
        console.error('Error fetching data:', error);
        throw new Error('Failed to fetch content types');
      });
  }

  private async getContentTypeById(parameters: GetContentTypeByIdParameter, credentials: Credentials) {

    const options = {
      method: 'GET',
      headers: {
        accept: 'application/json',
      }
    };

    return fetch(`${credentials.cms_base_url}/api/episerver/v3.0/contenttypes/{id}/${parameters.id}`, options)
      .then((response) => response.json())  // am*** might need to manage non-200 responses
      .then((data) => ({
        output_value: data
      }))
      .catch((error) => {
        console.error('Error fetching data:', error);
        throw new Error('Failed to fetch content type by ID');
      });
  }

  private async listLanguageBranches(credentials: Credentials) {
    const url = `${credentials.cms_base_url}/api/episerver/v3.0/languagebranches`;
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
    const base = `${credentials.cms_base_url}/api/episerver/v3.0/languagebranches`;
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

  // ======================
  // Editor Definitions API
  // ======================

  private async listEditorDefinitionsHandler(parameters: ListEditorDefinitionsParameters, credentials: Credentials) {

    logger.info('calling list-editor-definitions...');

    const options = {
      method: 'GET',
      headers: {
        accept: 'application/json',
      }
    };

    const url = parameters.typeFilter
      ? `${credentials.cms_base_url}${OPTIMIZELY_EDITORS_API_ENDPOINT}?typeFilter=${encodeURIComponent(parameters.typeFilter)}`
      : `${credentials.cms_base_url}${OPTIMIZELY_EDITORS_API_ENDPOINT}`;

    return fetch(url, options)
      .then((response) => {
        logger.info('response status: ', response.status);
        return response.json();
      })
      .then((data) => ({
        output_value: data
      }))
      .catch((error) => {
        console.error('Error fetching data:', error);
        throw new Error('Failed to fetch editor definitions');
      });
  }

  private async getEditorDefinitionHandler(parameters: GetEditorDefinitionParameters, credentials: Credentials) {

    const options = {
      method: 'GET',
      headers: {
        accept: 'application/json',
      }
    };

    const url = `${credentials.cms_base_url}${OPTIMIZELY_EDITORS_API_ENDPOINT}/${encodeURIComponent(parameters.dataType)}/${encodeURIComponent(parameters.uiHint)}`;

    return fetch(url, options)
      .then((response) => {
        if (response.status === 404) {
          return null;
        }
        return response.json();
      })  // am*** might need to manage non-200 responses
      .then((data) => {
        if (data === null) {
          return null;
        }
        return {
          output_value: data
        };
      })
      .catch((error) => {
        console.error('Error fetching data:', error);
        throw new Error('Failed to fetch editor definition');
      });
  }
}
