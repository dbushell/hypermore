/** List of tags to never render */
export const specialTags = new Set([
  'ssr-else',
  'ssr-elseif',
  'ssr-fragment',
  'ssr-for',
  'ssr-if',
  'ssr-slot',
  'ssr-portal'
]);

/** Reserved property names */
export const reservedProps = new Set(['globalProps']);

/** Returns true if name is valid variable */
export const isVariable = (name: string): boolean => {
  return /^[a-zA-Z_$]\w*$/.test(name);
};

/** Return conventional component name from path */
export const componentName = (path: string | URL): string => {
  let name = path.toString();
  name = name.split('/').at(-1) ?? name;
  name = name.split('.', 1)[0];
  name = name.replace(/[^\w:-]/g, '');
  return toKebabCase(name);
};

/** Return an encoded hash */
export const encodeHash = async (
  value: string,
  algorithm?: AlgorithmIdentifier
): Promise<string> => {
  const buffer = new Uint8Array(
    await crypto.subtle.digest(
      algorithm ?? 'SHA-256',
      new TextEncoder().encode(value)
    )
  );
  return Array.from(buffer)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
};

// Copyright 2018-2024 the Deno authors. All rights reserved. MIT license.

const CAPITALIZED_WORD_REGEXP = /\p{Lu}\p{Ll}+/u;
const ACRONYM_REGEXP = /\p{Lu}+(?=(\p{Lu}\p{Ll})|\P{L}|\b)/u;
const LOWERCASED_WORD_REGEXP = /(\p{Ll}+)/u;
const ANY_LETTERS = /\p{L}+/u;
const DIGITS_REGEXP = /\p{N}+/u;

const WORD_OR_NUMBER_REGEXP = new RegExp(
  `${CAPITALIZED_WORD_REGEXP.source}|${ACRONYM_REGEXP.source}|${LOWERCASED_WORD_REGEXP.source}|${ANY_LETTERS.source}|${DIGITS_REGEXP.source}`,
  'gu'
);

export function splitToWords(input: string) {
  return input.match(WORD_OR_NUMBER_REGEXP) ?? [];
}

export function toKebabCase(input: string): string {
  input = input.trim();
  return splitToWords(input).join('-').toLocaleLowerCase();
}
