import { logger, Function, Response } from '@zaiusinc/app-sdk';

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

// Define Opal tool metadata  - list of tools and their parameters
const discoveryPayload = {
  functions: [
    {
      name: 'tool1', // tool name will show on the list in Opal UI
      description: 'Description of the tool', // description - tells Opal what the tool does
      parameters: [
        // parameters
        {
          name: 'param1',
          type: 'string',
          description: 'Text param',
          required: true,
        },
        {
          name: 'param2',
          type: 'number',
          description: 'Numeric param',
          required: false,
        },
      ],
      endpoint: '/tools/greeting',
      http_method: 'POST',
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
    if (this.request.path === '/discovery') {
      return new Response(200, discoveryPayload);
    } else {
      return new Response(400, 'Invalid path');
    }
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

}
