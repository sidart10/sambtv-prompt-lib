/**
 * Output Parser for Structured AI Responses
 * Handles JSON, XML, and basic structured formats
 */

export interface ParsedOutput {
  type: 'json' | 'xml' | 'text' | 'markdown';
  isStructured: boolean;
  data: any;
  formatted: string;
  errors?: string[];
}

export interface JsonParseResult {
  success: boolean;
  data?: any;
  error?: string;
}

/**
 * Attempts to parse JSON from a string, handling common formatting issues
 */
export function tryParseJson(text: string): JsonParseResult {
  try {
    // First try direct parsing
    const parsed = JSON.parse(text);
    return { success: true, data: parsed };
  } catch (error) {
    // Try to extract JSON from markdown code blocks
    const codeBlockMatch = text.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (codeBlockMatch) {
      try {
        const parsed = JSON.parse(codeBlockMatch[1].trim());
        return { success: true, data: parsed };
      } catch (innerError) {
        return { success: false, error: 'Invalid JSON in code block' };
      }
    }

    // Try to find JSON-like content within the text
    const jsonMatch = text.match(/\{[\s\S]*\}|\[[\s\S]*\]/);
    if (jsonMatch) {
      try {
        const parsed = JSON.parse(jsonMatch[0]);
        return { success: true, data: parsed };
      } catch (innerError) {
        return { success: false, error: 'Invalid JSON structure' };
      }
    }

    return { success: false, error: 'No valid JSON found' };
  }
}

/**
 * Attempts to parse XML from a string
 */
export function tryParseXml(text: string): { success: boolean; data?: any; error?: string } {
  try {
    if (typeof window !== 'undefined' && window.DOMParser) {
      const parser = new DOMParser();
      const doc = parser.parseFromString(text, 'text/xml');
      
      // Check for parsing errors
      const parseError = doc.querySelector('parsererror');
      if (parseError) {
        return { success: false, error: 'XML parsing error' };
      }

      // Convert XML to a simple object representation
      const xmlToObj = (node: Element): any => {
        const obj: any = {};
        
        // Add attributes
        if (node.attributes.length > 0) {
          obj['@attributes'] = {};
          for (let i = 0; i < node.attributes.length; i++) {
            const attr = node.attributes[i];
            obj['@attributes'][attr.name] = attr.value;
          }
        }

        // Add child nodes
        const children = Array.from(node.children);
        if (children.length === 0) {
          obj['#text'] = node.textContent;
        } else {
          children.forEach(child => {
            const childName = child.tagName;
            const childObj = xmlToObj(child);
            
            if (obj[childName]) {
              if (!Array.isArray(obj[childName])) {
                obj[childName] = [obj[childName]];
              }
              obj[childName].push(childObj);
            } else {
              obj[childName] = childObj;
            }
          });
        }

        return obj;
      };

      const rootElement = doc.documentElement;
      const result = { [rootElement.tagName]: xmlToObj(rootElement) };
      
      return { success: true, data: result };
    }
    
    return { success: false, error: 'XML parsing not available' };
  } catch (error) {
    return { success: false, error: 'XML parsing failed' };
  }
}

/**
 * Detects if text contains structured data patterns
 */
export function detectStructuredFormat(text: string): 'json' | 'xml' | 'markdown' | 'text' {
  const trimmed = text.trim();
  
  // Check for JSON
  if ((trimmed.startsWith('{') && trimmed.endsWith('}')) || 
      (trimmed.startsWith('[') && trimmed.endsWith(']')) ||
      trimmed.includes('```json')) {
    return 'json';
  }
  
  // Check for XML
  if (trimmed.startsWith('<') && trimmed.endsWith('>') && 
      trimmed.includes('</') && !trimmed.includes('<html>')) {
    return 'xml';
  }
  
  // Check for markdown patterns
  if (trimmed.includes('##') || trimmed.includes('**') || 
      trimmed.includes('```') || trimmed.includes('- ') ||
      trimmed.includes('1. ')) {
    return 'markdown';
  }
  
  return 'text';
}

/**
 * Formats JSON for display with proper indentation
 */
export function formatJson(data: any): string {
  try {
    return JSON.stringify(data, null, 2);
  } catch (error) {
    return String(data);
  }
}

/**
 * Main parser function that handles various output formats
 */
export function parseOutput(text: string): ParsedOutput {
  const format = detectStructuredFormat(text);
  const errors: string[] = [];
  
  switch (format) {
    case 'json': {
      const jsonResult = tryParseJson(text);
      if (jsonResult.success) {
        return {
          type: 'json',
          isStructured: true,
          data: jsonResult.data,
          formatted: formatJson(jsonResult.data),
        };
      } else {
        errors.push(jsonResult.error || 'Failed to parse JSON');
        return {
          type: 'text',
          isStructured: false,
          data: text,
          formatted: text,
          errors,
        };
      }
    }
    
    case 'xml': {
      const xmlResult = tryParseXml(text);
      if (xmlResult.success) {
        return {
          type: 'xml',
          isStructured: true,
          data: xmlResult.data,
          formatted: text, // Keep original XML formatting
        };
      } else {
        errors.push(xmlResult.error || 'Failed to parse XML');
        return {
          type: 'text',
          isStructured: false,
          data: text,
          formatted: text,
          errors,
        };
      }
    }
    
    case 'markdown':
      return {
        type: 'markdown',
        isStructured: true,
        data: text,
        formatted: text,
      };
    
    default:
      return {
        type: 'text',
        isStructured: false,
        data: text,
        formatted: text,
      };
  }
}

/**
 * Validates a JSON schema against data (basic validation)
 */
export function validateJsonSchema(data: any, schema: any): { valid: boolean; errors: string[] } {
  const errors: string[] = [];
  
  if (!schema || typeof schema !== 'object') {
    return { valid: true, errors: [] };
  }
  
  // Basic type checking
  if (schema.type) {
    const actualType = Array.isArray(data) ? 'array' : typeof data;
    if (actualType !== schema.type) {
      errors.push(`Expected type ${schema.type}, got ${actualType}`);
    }
  }
  
  // Required properties
  if (schema.required && Array.isArray(schema.required) && typeof data === 'object') {
    schema.required.forEach((prop: string) => {
      if (!(prop in data)) {
        errors.push(`Missing required property: ${prop}`);
      }
    });
  }
  
  return { valid: errors.length === 0, errors };
}