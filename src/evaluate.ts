import type {Environment, JSONArray, JSONValue, Props} from './types.ts';
import {escape} from './parse.ts';
import {encodeValue, escapeChars, reservedProps, toCamelCase} from './utils.ts';
import tagComponent from './tag-component.ts';

/**
 * Evaluate JavaScript code
 * @param code JavaScript code
 * @returns Evaluated return value
 */
export const evaluateCode = async <T = JSONValue>(
  code: string,
  env: Environment
): Promise<T> => {
  let detail = '';
  const {node} = env;
  if (node) {
    // Improve error message with expression and parent component
    detail = ` in expression: "${escapeChars(node.toString())}"'`;
    const parent = tagComponent.validate(node, env)
      ? node
      : node.closest((n) => tagComponent.validate(n, env));
    if (parent) detail += ` in element: <${parent.raw}>`;
  }
  const module = Function(`'use strict'; return async function() {
    try {
      ${code}
    } catch (err) {
      throw new Error(\`"\${err.message}"${detail}\`);
    }
  }`)();
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
  env: Environment,
  otherProps?: Props,
  wrapReturn = true
): Promise<T> => {
  // Add global props to scope
  let code = `const globalProps = ${encodeValue(env.ctx.globalProps)};\n`;

  // Add context props into scope
  const props = {
    ...env.ctx.globalProps,
    ...env.localProps.at(-1),
    ...otherProps
  };
  for (let [key, value] of Object.entries(props)) {
    key = toCamelCase(key);
    if (reservedProps.has(key)) {
      console.warn(`invalid prop "${key}" is reserved`);
      continue;
    }
    code += `const ${key} = ${encodeValue(value)};\n`;
  }
  if (wrapReturn) {
    code = `${code}\n return (${expression})`;
  } else {
    code = `${code}\n ${expression}`;
  }
  return evaluateCode(code, env);
};

/**
 * Parse text and evaluate `{{expression}}` codes within
 * @param text Text to parse
 * @param context Render context
 * @returns Array of rendered text and list of evaluations
 */
export const evaluateText = async (
  text: string,
  env: Environment
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
      const result = await evaluateContext(match[1], env);
      out += env.ctx.autoEscape ? escape(String(result)) : result;
      results.push(result);
    }
  }
  return [out, results];
};
