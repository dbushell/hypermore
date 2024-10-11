import type { Environment, JSONObject, JSONValue } from "./types.ts";
import { escapeChars, reservedProps, toCamelCase } from "./utils.ts";

export const envHeader = `
let __EXPORT = '';
const __REPLACE = new Map();
const __PORTALS = new Map();
const __FRAGMENTS = new Set();
const __ENTITIES = new Map([
  ['&', '&amp;'],
  ['<', '&lt;'],
  ['>', '&gt;'],
  ['"', '&quot;'],
  ["'", '&#39;']
]);
const __ENTITY_KEYS = new RegExp([...__ENTITIES.keys()].join('|'), 'g');
const __ESC = (value, escape) => {
  if (escape === false) return value;
  return String(value).replaceAll(__ENTITY_KEYS, (k) => __ENTITIES.get(k));
};
const __FOR_ITEMS = (items) => {
  // Convert string to numeric value
  if (typeof items === 'string') {
    const parseItems = Number.parseInt(items);
    if (isNaN(parseItems) === false) {
      items = parseItems;
    }
  }
  // Convert number to array, e.g. "5" iterates [0,1,2,3,4]
  if (typeof items === 'number') {
    return [...Array(items).keys()];
  }
  // Ensure items is iterable
  if (typeof items[Symbol.iterator] !== 'function') {
    console.warn('<ssr-for> invalid "of" property (not iterable)');
    return [];
  }
  return items;
};
`;

export const envFooter = `
const _FRAGMENT_VALUES = [...__FRAGMENTS.values()];
for (const [name, comment] of __PORTALS) {
  __EXPORT = __EXPORT.replace(comment, () => {
    return _FRAGMENT_VALUES
      .map(({html, portal}) => (portal === name ? html : ''))
      .join('');
  });
}
__REPLACE.forEach((v, k) => {
  __EXPORT = __EXPORT.replace(k, () => v);
});
return __EXPORT;
`;

/** Execute code and return final string */
export const renderEnv = (env: Environment): Promise<string> => {
  const module = Function(`'use strict'; return async function() {
    try {
      ${env.code}
    } catch (err) {
      throw new Error(\`"\${err.message}"\`);
    }
  }`)();
  return module();
};

/** Parse text and replace `{{expression}}` with code */
export const parseVars = (text: string, escape = true): string => {
  let out = "";
  while (text.length) {
    // Search for next expression
    const next = text.indexOf("{{");
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
      out += "{";
      text = text.substring(1);
    } else {
      out += `\`+__ESC(${match[1]}, ${escape})+\``;
      text = text.substring(match[0].length);
    }
  }
  return out;
};

/** Encode value for JavaScript string template */
export const encodeVars = (value: JSONValue, parse = false): string => {
  if (value === null) return "null";
  if (Array.isArray(value)) {
    return `[${value.map((v) => encodeVars(v, parse)).join(",")}]`;
  }
  switch (typeof value) {
    case "boolean":
    case "number":
      return `${value}`;
    case "string":
      value = `\`${escapeChars(value)}\``;
      return parse ? parseVars(value, false) : value;
    case "object": {
      // Do not attempt to parse objects
      return `{${
        Object.entries(value)
          .map(([k, v]) => `'${k}':${encodeVars(v, false)}`)
          .join(",")
      }}`;
    }
  }
};

/** Add local props to JavaScript block */
export const addVars = (
  props: JSONObject,
  prevProps: Array<JSONObject> = [],
  env: Environment,
  parse = true,
  check = true,
): JSONObject => {
  const updated: JSONObject = {};
  for (let [key, value] of Object.entries(props)) {
    // Check stack for previous definition
    for (let i = prevProps.length - 1; i > -1; i--) {
      if (Object.keys(prevProps[i]).includes(key)) {
        if (Object.hasOwn(updated, key) === false) {
          updated[key] = prevProps[i][key];
          break;
        }
      }
    }
    // Validate prop  name
    if (check) {
      key = toCamelCase(key);
      if (reservedProps.has(key)) {
        console.warn(`invalid prop "${key}" is reserved`);
        continue;
      }
    }
    // Encode value
    value = encodeVars(value, parse);
    // Unwrap single expressions from string
    const match = value.match(/^``\+(__ESC\(.*\))\+``$/);
    if (match) value = match[1];
    // Render output
    if (Object.hasOwn(updated, key) === false) env.code += `let `;
    env.code += `${key} = ${value};\n`;
  }
  return updated;
};
