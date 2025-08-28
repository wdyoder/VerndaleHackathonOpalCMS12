import { logger, Function, Response } from '@zaiusinc/app-sdk';

// Define interfaces for the parameters of each function
interface Tool1Parameters {
  param1: string;
  param2: number;
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
    } else if (this.request.path === '/tools/greeting') {
      const params = this.extractParameters() as Tool1Parameters;
      const response = this.tool1Handler(params);
      return new Response(200, response);
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
  private async tool1Handler(parameters: Tool1Parameters) {
    // implement your logic here

    return {
      output_value: 'Output from the tool',
    };
  }
}
