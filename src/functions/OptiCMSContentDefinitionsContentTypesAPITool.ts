import { logger, Function, Response } from '@zaiusinc/app-sdk';
import { storage } from '@zaiusinc/app-sdk';

// constants
const DISCOVERY_ENDPOINT = '/discovery';
const GET_CONTENT_TYPES_ENDPOINT = '/api/episerver/v3.0/contenttypes';
const GET_CONTENT_TYPE_BY_ID_ENDPOINT = '/api/episerver/v3.0/contenttypes/{id}';

// defines parameters interfaces (ContentTypes)
interface GetContentTypesParameter {
  // am*** not implemented because this parameter is optional, and will provide an x-epi-continuation token to get next batch of content-types  
  // top: number;                  
  // am*** not implemented because this parameter is optional, and not documented in the documentation
  //  includeSystemTypes: boolean;
}

// defines parameters interfaces (ContentTypeById)
interface GetContentTypeByIdParameter {
  id: string;
}

interface Credentials {
  cms_base_url: string;
}

// Define Opal tool metadata  - list of tools and their parameters
const discoveryPayload = {
  'functions': [
    {
      'name': 'getContentTypes',  
      'description': 'List all content types in the system',       
      'parameters': [
      ],
      'endpoint': GET_CONTENT_TYPES_ENDPOINT,
      'http_method': 'GET'
    }, 
    {
      'name': 'getContentTypeById',  
      'description': 'Get a content type by its ID',       
      'parameters': [
        {
          'name': 'id',
          'type': 'string',
          'required': true,
          'description': 'The ID of the content type to retrieve'
        }
      ],
      'endpoint': GET_CONTENT_TYPE_BY_ID_ENDPOINT,
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
export class OptiCMSContentDefinitionsContentTypesAPIToolFunction extends Function {

  public async perform(): Promise<Response> {

    if (this.request.path === DISCOVERY_ENDPOINT) {
      return new Response(200, discoveryPayload);      
    } 
    
    if (this.request.path === GET_CONTENT_TYPES_ENDPOINT) {
      const params = this.extractParameters() as GetContentTypesParameter;
      const credentials = await storage.settings.get('auth').then(s => s) as Credentials;     // am*** need to extract to a function
      const response =  this.getContentTypes(params, credentials);            
      return new Response(200, response);      
    }    

    if (this.request.path === GET_CONTENT_TYPE_BY_ID_ENDPOINT) {
      const params = this.extractParameters() as GetContentTypeByIdParameter;
      const credentials = await storage.settings.get('auth').then(s => s) as Credentials;     // am*** need to extract to a function
      const response =  this.getContentTypeById(params, credentials);            
      return new Response(200, response);      
    }

    return new Response(400, 'Invalid path');
  }

  private extractParameters() {
    // Extract parameters from the request body
    if (this.request.bodyJSON && this.request.bodyJSON.parameters) {
      // Standard format: { "parameters": { ... } }
      logger.info('Extracted parameters from \'parameters\' key:', this.request.bodyJSON.parameters);
      return this.request.bodyJSON.parameters;
    } 

    // Fallback for direct testing: { "name": "value" }
    logger.warn('\'parameters\' key not found in request body. Using body directly.');
    return this.request.bodyJSON;
  }


  /**
   * The logic of the tool goes here.
   */

  private async getCredentials() {
    // am*** to be implemented
  }

  private async getContentTypes(parameters: GetContentTypesParameter, credentials: Credentials) {
        
    const options = {
      method: 'GET',
      headers: {
        accept: 'application/json',
      }
    };

    return fetch(`${credentials.cms_base_url}${GET_CONTENT_TYPES_ENDPOINT}`, options)
      .then(response => response.json())  // am*** might need to manage non-200 responses
      .then(data => {
        return {
          output_value: data
        };
      })
      .catch(error => {
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
   
    return fetch(`${credentials.cms_base_url}${GET_CONTENT_TYPE_BY_ID_ENDPOINT}/${parameters.id}`, options)
      .then(response => response.json())  // am*** might need to manage non-200 responses
      .then(data => {
        return {
          output_value: data
        };
      })
      .catch(error => {
        console.error('Error fetching data:', error);
        throw new Error('Failed to fetch content type by ID');
      });    
  }
}
