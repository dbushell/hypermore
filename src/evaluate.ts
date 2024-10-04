import type {Hypermore, JSONArray, JSONValue} from './types.ts';
import {escape, escapeApostrophe} from './parse.ts';
import {reservedProps} from './utils.ts';

/**
 * Evaluate JavaScript code
 * @param code JavaScript code
 * @returns Evaluated return value
 */
export const evaluateCode = async <T = JSONValue>(code: string): Promise<T> => {
  const module = Function(`'use strict'; return async function() {${code}}`)();
  return (await module()) as T;
};

/**
 * Evaluate expression with local scope variables from the context
 * @param expression JavaScript expression
 * @param context Render context
 * @returns Evaluated return value
 */
export const evaluateContext = <T = JSONValue>(
  expression: string,
  context: Hypermore
): Promise<T> => {
  // Add global props to scope
  let globalProps = JSON.stringify(context.globalProps);
  globalProps = escapeApostrophe(globalProps);
  let code = `const globalProps = JSON.parse('${globalProps}');\n`;
  // Add context props into scope
  for (let [key, value] of Object.entries(context.localProps)) {
    if (reservedProps.has(key)) {
      console.warn(`invalid reserved prop name "${key}"`);
      continue;
    }
    value = JSON.stringify(value);
    value = escapeApostrophe(value);
    code += `const ${key} = JSON.parse('${value}');\n`;
  }
  return evaluateCode(`${code}\n return (${expression})`);
};

/**
 * Parse text and evaluate `{{expression}}` codes within
 * @param text Text to parse
 * @param context Render context
 * @returns Array of rendered text and list of evaluations
 */
export const evaluateText = async (
  text: string,
  context: Hypermore
): Promise<[string, JSONArray]> => {
  let out = '';
  const results: JSONArray = [];
  while (text.length) {
    // Search for next expression
    const next = text.indexOf('{{');
    // Append remaining text if not found
    if (next === -1) {
      out += text;
      break;
    }
    // Append and remove text before expression
    out += text.substring(0, next);
    text = text.substring(next);
    // Validate expression
    const match = text.match(/^{{([^{].*?)}}/s);
    if (match === null) {
      // Skip and continue searching
      out += '{';
      text = text.substring(1);
    } else {
      // Strip and append evaluation
      text = text.substring(match[0].length);
      const result = await evaluateContext(match[1], context);
      out += context.autoEscape ? escape(String(result)) : result;
      results.push(result);
    }
  }
  return [out, results];
};
