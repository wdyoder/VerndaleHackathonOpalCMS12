import { logger, Function, Response } from '@zaiusinc/app-sdk';
import { storage } from '@zaiusinc/app-sdk';

// Tool Endpoints
const DISCOVERY_ENDPOINT = '/discovery';
const HEALTH_ENDPOINT = '/health';
const GET_CONTENT_STRUCTURE_FROM_NODE_ENDPOINT = '/getContentStructureFromNode';
const CREATE_CONTENT_ENDPOINT = '/createContent';
const CREATE_CONTENT_FROM_ASK_ENDPOINT = '/createContentFromAsk';
const MOVE_CONTENT_ENDPOINT = '/moveContent';

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
    {
      name: 'content-create-from-ask',
      description:
        'Create content from a natural language ask. The tool discovers content types, properties, and site structure to infer the payload.',
      parameters: [
        {
          name: 'ask',
          type: 'string',
          description:
            'Instruction, e.g., "find a content type to create a CTA card block under parent 4187 and set heading to Viva Opal"',
          required: true,
        },
        {
          name: 'discoveryRoot',
          type: 'string',
          description: 'Optional root id/guid to fetch partial content structure for context.',
          required: false,
        },
        {
          name: 'maxDepth',
          type: 'number',
          description: 'Depth to traverse when discovering content structure (default: 2).',
          required: false,
        },
        {
          name: 'maxNodes',
          type: 'number',
          description: 'Total node limit during traversal to keep requests bounded (default: 50).',
          required: false,
        },
        {
          name: 'language',
          type: 'string',
          description: 'Language name (default: en).',
          required: false,
        },
        {
          name: 'status',
          type: 'string',
          description: "Workflow status (default: 'Published').",
          required: false,
        },
        {
          name: 'autoSelectParent',
          type: 'boolean',
          description: 'If true and parent is not provided, auto-select best candidate parent.',
          required: false,
        },
      ],
      endpoint: CREATE_CONTENT_FROM_ASK_ENDPOINT,
      http_method: 'POST',
    },
    {
      name: 'content-move',
      description: 'Moves a content item from its current location to another parent.',
      parameters: [
        {
          name: 'contentIdentifier',
          type: 'string',
          description: 'Content reference or unique identifier (id or guid) of the item to move.',
          required: true,
        },
        {
          name: 'parentLink',
          type: 'object',
          description: 'Destination parent link object: { id?: number; guidValue?: string }',
          required: true,
        },
      ],
      endpoint: MOVE_CONTENT_ENDPOINT,
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

    if (this.request.path === CREATE_CONTENT_FROM_ASK_ENDPOINT) {
      const params = this.extractParameters() as {
        ask: string;
        discoveryRoot?: string;
        language?: string;
        status?: string;
      };
      const result = await this.createContentFromAsk(params);
      logger.info('response from createContentFromAsk: ', result);
      return new Response(200, result);
    }

    if (this.request.path === MOVE_CONTENT_ENDPOINT) {
      const params = this.extractParameters() as {
        contentIdentifier: string;
        parentLink: { id?: number; guidValue?: string };
      };
      const result = await this.moveContent(params);
      logger.info('response from moveContent: ', result);
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

  // removed createContentSmart per request; create via natural-language ask instead

  private async resolveContentType(
    query: string,
    credentials: Credentials,
  ): Promise<{
    baseType: string;
    modelName: string;
  }> {
    const url = `${credentials.cms_base_url}/api/episerver/v3.0/contenttypes?includeSystemTypes=false`;
    const headers: Record<string, string> = { accept: 'application/json' };
    if (credentials.basic_username) {
      const token = Buffer.from(
        `${credentials.basic_username}:${credentials.basic_password ?? ''}`,
      ).toString('base64');
      headers.Authorization = `Basic ${token}`;
    } else if (credentials.access_token) {
      headers.Authorization = `Bearer ${credentials.access_token}`;
    }

    const list = await fetch(url, { method: 'GET', headers })
      .then((r) => r.json())
      .catch(() => [] as unknown[]);

    const q = query.toLowerCase();
    let match: any = Array.isArray(list)
      ? list.find((t: any) => String(t.displayName ?? t.name ?? '').toLowerCase() === q)
      : undefined;
    if (!match && Array.isArray(list)) {
      match = list.find((t: any) =>
        String(t.displayName ?? t.name ?? '')
          .toLowerCase()
          .includes(q),
      );
    }

    // Derive model name and base type heuristically
    const modelName =
      String(match?.name ?? match?.modelName ?? query)
        .replace(/\s+/g, '')
        .replace(/[^A-Za-z0-9_]/g, '') || query;
    let baseType = 'Page';
    const nameStr = String(match?.displayName ?? match?.name ?? '').toLowerCase();
    if (nameStr.includes('block') || /block$/i.test(modelName)) baseType = 'Block';
    if (nameStr.includes('media')) baseType = 'Media';
    if (nameStr.includes('folder')) baseType = 'Folder';

    return { baseType, modelName };
  }

  private buildAuthHeaders(credentials: Credentials): Record<string, string> {
    const headers: Record<string, string> = { accept: 'application/json' };
    if (credentials.basic_username) {
      const token = Buffer.from(
        `${credentials.basic_username}:${credentials.basic_password ?? ''}`,
      ).toString('base64');
      headers.Authorization = `Basic ${token}`;
    } else if (credentials.access_token) {
      headers.Authorization = `Bearer ${credentials.access_token}`;
    }
    return headers;
  }

  private async listAllContentTypes(credentials: Credentials): Promise<any[]> {
    const baseUrl = `${credentials.cms_base_url}/api/episerver/v3.0/contenttypes?includeSystemTypes=false`;
    const headers = this.buildAuthHeaders(credentials);
    const all: any[] = [];
    let url = baseUrl;
    // Simple pagination via x-epi-continuation if present
    // Some servers don’t use it; we’ll still work with a single page
    while (true) {
      const res = await fetch(url, { method: 'GET', headers });
      const data = (await res.json()) as any[];
      if (Array.isArray(data)) all.push(...data);
      const cont = res.headers.get('x-epi-continuation');
      if (!cont) break;
      const u = new URL(baseUrl);
      u.searchParams.set('x-epi-continuation', cont);
      url = u.toString();
    }
    return all;
  }

  private async getStructureSnapshot(
    credentials: Credentials,
    root?: string,
    maxDepth = 2,
    maxNodes = 50,
  ): Promise<Record<string, unknown>> {
    const authHeaders = this.buildAuthHeaders(credentials);
    if (!root) {
      // try global root redirect endpoint
      try {
        const res = await fetch(`${credentials.cms_base_url}/api/episerver/v3.0/`, {
          method: 'GET',
          headers: authHeaders,
          redirect: 'follow',
        } as RequestInit);
        const redirected =
          res.url || `${credentials.cms_base_url}/api/episerver/v3.0/contentstructure/1`;
        const match = redirected.match(/contentstructure\/([^/?#]+)/);
        const fallbackRoot = match ? decodeURIComponent(match[1]) : '1';
        return this.getStructureSnapshot(credentials, fallbackRoot, maxDepth, maxNodes);
      } catch {
        return {};
      }
    }
    const url = `${credentials.cms_base_url}/api/episerver/v3.0/contentstructure/${encodeURIComponent(
      root,
    )}`;
    try {
      const res = await fetch(url, { method: 'GET', headers: authHeaders });
      const top = (await res.json()) as Record<string, unknown>;
      // BFS traversal to bounded depth and node count
      const queue: Array<{ node: Record<string, unknown>; depth: number }> = [
        { node: top, depth: 0 },
      ];
      const visited: Record<string, Record<string, unknown>> = {};
      const outChildren: Array<Record<string, unknown>> = [];
      let count = 0;
      while (queue.length && count < maxNodes) {
        const current = queue.shift()!;
        const currentNode = current.node as any;
        const nodeId: string = String(currentNode.id ?? currentNode.guidValue ?? Math.random());
        if (visited[nodeId]) continue;
        visited[nodeId] = currentNode;
        count += 1;
        const children: Array<Record<string, unknown>> = Array.isArray(currentNode.children)
          ? (currentNode.children as Array<Record<string, unknown>>)
          : [];
        outChildren.push(...children);
        if (current.depth < maxDepth) {
          children.forEach((child) => queue.push({ node: child, depth: current.depth + 1 }));
        }
      }
      return { ...top, children: outChildren } as Record<string, unknown>;
    } catch {
      return {};
    }
  }

  private tokenize(text: string): string[] {
    return String(text)
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, ' ')
      .split(/\s+/)
      .filter(Boolean);
  }

  private scoreContentType(ask: string, type: any): number {
    const tokens = this.tokenize(ask);
    const name = String(type.displayName ?? type.name ?? '').toLowerCase();
    const propNames: string[] = Array.isArray(type.properties)
      ? (type.properties as Array<Record<string, unknown>>).map((p: any) =>
          String(p.name ?? p.displayName ?? '').toLowerCase(),
        )
      : [];
    let score = 0;
    tokens.forEach((t) => {
      if (name.includes(t)) score += 3;
      if (propNames.some((pn) => pn.includes(t))) score += 1;
    });
    if (tokens.includes('block') && /block/i.test(name)) score += 2;
    if (tokens.includes('page') && /page/i.test(name)) score += 2;
    if (tokens.includes('media') && /media/i.test(name)) score += 2;
    return score;
  }

  private extractParentIdOrGuid(ask: string): { id?: number; guidValue?: string } | undefined {
    const idMatch = ask.match(/parent\s*(?:link)?\s*(?:id)?\s*(\d{1,10})/i);
    if (idMatch) return { id: Number(idMatch[1]) };
    const guidMatch = ask.match(/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i);
    if (guidMatch) return { guidValue: guidMatch[0] } as { guidValue: string };
    return undefined;
  }

  private extractQuotedStrings(ask: string): string[] {
    const matches = (ask.match(/"([^"]+)"|'([^']+)'/g) || []) as string[];
    return matches.map((m) => m.slice(1, -1));
  }

  private inferFieldsFromAsk(
    ask: string,
    targetProps: Array<{ name?: string; displayName?: string }>,
  ): Record<string, unknown> {
    const fields: Record<string, unknown> = {};
    const quotes = this.extractQuotedStrings(ask);
    const propKeys = targetProps.map((p) => String(p.name ?? p.displayName ?? ''));

    const trySet = (key: string, value: unknown) => {
      if (!fields[key]) fields[key] = { value };
    };

    // Heuristic mappings
    if (quotes.length) {
      // Heading/Title candidates
      const primary = quotes[0];
      const headingKey = propKeys.find((k) => /heading|title/i.test(k));
      if (headingKey) trySet(headingKey, primary);
    }
    if (!Object.keys(fields).length && quotes.length) {
      // Fallback: assign first quote to first string-like property
      const firstProp = propKeys[0];
      if (firstProp) trySet(firstProp, quotes[0]);
    }

    // Add anything explicitly like set <prop> to "value"
    const setMatches = ask.match(/set\s+([a-z0-9_\s]+)\s+to\s+("[^"]+"|'[^']+')/gi) || [];
    setMatches.forEach((m) => {
      const [, k, v] = m.match(/set\s+([a-z0-9_\s]+)\s+to\s+("([^"]+)"|'([^']+)')/i) || [];
      if (k && v) {
        const candidate = propKeys.find(
          (p) => p.toLowerCase().replace(/\s+/g, '') === k.toLowerCase().replace(/\s+/g, ''),
        );
        if (candidate) trySet(candidate, v.slice(1, -1));
      }
    });

    return fields;
  }

  private async createContentFromAsk(parameters: {
    ask: string;
    discoveryRoot?: string;
    language?: string;
    status?: string;
    autoSelectParent?: boolean;
    maxDepth?: number;
    maxNodes?: number;
  }) {
    if (!parameters?.ask) {
      throw new Error("Missing required parameter 'ask'");
    }

    const credentials = (await storage.settings.get('auth').then((s) => s)) as Credentials;

    // Move intent detection: if ask is to move existing content, delegate to move
    const moveIntent = this.extractMoveIntent(parameters.ask);
    if (moveIntent) {
      if (!moveIntent.parentLink) {
        return {
          output_value: {
            message:
              'Move intent detected but destination parent not found. Please specify a target parent id or guid (e.g., "under parent 123" or a GUID).',
          },
        };
      }
      return this.moveContent({
        contentIdentifier: moveIntent.contentIdentifier,
        parentLink: moveIntent.parentLink,
      });
    }

    // Gather context
    const [types, structure] = await Promise.all([
      this.listAllContentTypes(credentials),
      this.getStructureSnapshot(
        credentials,
        parameters.discoveryRoot,
        parameters.maxDepth ?? 2,
        parameters.maxNodes ?? 50,
      ),
    ]);

    // Pick best content type
    let best: any | undefined;
    let bestScore = -1;
    (types || []).forEach((t) => {
      const score = this.scoreContentType(parameters.ask, t);
      if (score > bestScore) {
        best = t;
        bestScore = score;
      }
    });
    if (!best) {
      throw new Error('Could not infer a suitable content type from the ask.');
    }

    // Build contentType array
    const baseTypeGuess = /block/i.test(String(best.displayName ?? best.name ?? ''))
      ? 'Block'
      : 'Page';
    const modelName = String(best.name ?? best.modelName ?? 'Content').replace(/\s+/g, '');
    const contentTypeArr = [baseTypeGuess, modelName];

    // Parent resolution
    let parentLink = this.extractParentIdOrGuid(parameters.ask);
    if (!parentLink) {
      const proposals = this.proposeParents(structure, best);
      if (!proposals.length) {
        return {
          output_value: {
            message:
              'Parent not provided and no suitable parents found. Please specify a parent id or guid.',
            proposals: [],
          },
        };
      }
      if (parameters.autoSelectParent) {
        parentLink = proposals[0].parentLink;
      } else {
        return {
          output_value: {
            message: 'Please choose a parent for the new content.',
            proposals,
          },
        };
      }
    }

    // Fields
    const fields = this.inferFieldsFromAsk(parameters.ask, best.properties || []);

    // Name
    const nameFromQuote = this.extractQuotedStrings(parameters.ask)[0];
    const name = nameFromQuote || String(best.displayName ?? modelName);

    const payload = {
      name,
      language: { name: parameters.language ?? 'en' },
      contentType: contentTypeArr,
      parentLink,
      status: parameters.status ?? 'Published',
      ...fields,
    };

    return this.createContent({ payload });
  }

  private extractMoveIntent(ask: string):
    | {
        contentIdentifier: string;
        parentLink?: { id?: number; guidValue?: string };
      }
    | undefined {
    const text = String(ask);
    const guidPattern = /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i;

    // Try to capture source identifier after the word "move"
    let contentIdentifier: string | undefined;
    const moveGuid = text.match(/move\s+(?:content\s+)?(${guidPattern.source})/i);
    const moveId = text.match(/move\s+(?:content\s+)?(?:id\s*)?(\d{1,10})/i);
    if (moveGuid && moveGuid[1]) contentIdentifier = moveGuid[1];
    if (!contentIdentifier && moveId && moveId[1]) contentIdentifier = moveId[1];

    if (!/\bmove\b/i.test(text) || !contentIdentifier) return undefined;

    // Destination parent
    let parentLink: { id?: number; guidValue?: string } | undefined;
    const destGuid = text.match(
      new RegExp(`(?:under|to)\\s+(?:parent\\s+)?(${guidPattern.source})`, 'i'),
    );
    const destId = text.match(/(?:under|to)\s+(?:parent\s+)?(?:id\s*)?(\d{1,10})/i);
    if (destGuid && destGuid[1]) parentLink = { guidValue: destGuid[1] } as { guidValue: string };
    else if (destId && destId[1]) parentLink = { id: Number(destId[1]) };

    return { contentIdentifier, parentLink };
  }

  private async moveContent(parameters: {
    contentIdentifier: string;
    parentLink: { id?: number; guidValue?: string };
  }) {
    if (!parameters?.contentIdentifier) {
      throw new Error("Missing required parameter 'contentIdentifier'");
    }
    if (
      !parameters?.parentLink ||
      (!parameters.parentLink.id && !parameters.parentLink.guidValue)
    ) {
      throw new Error("Missing required parameter 'parentLink' with either 'id' or 'guidValue'");
    }

    const credentials = (await storage.settings.get('auth').then((s) => s)) as Credentials;

    const url = `${credentials.cms_base_url}/api/episerver/v3.0/contentmanagement/${encodeURIComponent(
      parameters.contentIdentifier,
    )}/move`;

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
      body: JSON.stringify({ parentLink: parameters.parentLink }),
    } as const;

    return fetch(url, options)
      .then(async (response) => {
        const contentType = response.headers.get('content-type') || '';
        const data = contentType.includes('application/json')
          ? await response.json()
          : await response.text();
        return { output_value: data } as { output_value: unknown };
      })
      .catch((error) => {
        console.error('Error moving content:', error);
        throw new Error('Failed to move content');
      });
  }

  private proposeParents(
    structure: Record<string, unknown>,
    contentType: any,
  ): Array<{
    idOrGuid: string;
    name?: string;
    score: number;
    parentLink: { id?: number; guidValue?: string };
  }> {
    const items: Array<Record<string, any>> = Array.isArray((structure as any)?.children)
      ? (((structure as any).children as Array<Record<string, any>>) ?? [])
      : [];

    const results: Array<{
      idOrGuid: string;
      name?: string;
      score: number;
      parentLink: { id?: number; guidValue?: string };
    }> = [];

    const desiredIsBlock = /block/i.test(String(contentType.displayName ?? contentType.name ?? ''));
    const scoreItem = (node: Record<string, any>): number => {
      const name = String(node.name ?? '').toLowerCase();
      let s = 0;
      if (desiredIsBlock && /block|widgets|components|assets|global/i.test(name)) s += 3;
      if (/folder|container|library/i.test(name)) s += 1;
      return s;
    };

    items.forEach((node) => {
      const score = scoreItem(node);
      if (score > 0) {
        const id = node.id as number | undefined;
        const guid = (node.guidValue as string | undefined) || (node.guid as string | undefined);
        const parentLink = id ? { id } : guid ? { guidValue: guid } : undefined;
        if (parentLink) {
          results.push({
            idOrGuid: String(id ?? guid),
            name: node.name as string,
            score,
            parentLink,
          });
        }
      }
    });

    results.sort((a, b) => b.score - a.score);
    return results.slice(0, 5);
  }
}
