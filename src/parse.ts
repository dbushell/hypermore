import {
  type ParseOptions,
  escapeApostrophe,
  escape,
  unescape,
  inlineTags,
  Node,
  getParseOptions,
  parseHTML as originalParseHTML
} from '@dbushell/hyperless';

export {escapeApostrophe, escape, unescape, inlineTags, Node};

// Extend defaults with custom tags
const parseOptions = getParseOptions();
parseOptions.voidTags.add('ssr-else');
parseOptions.voidTags.add('ssr-elseif');

// Wrap original with extended options
export const parseHTML = (
  html: string,
  options?: Partial<ParseOptions>
): Node =>
  originalParseHTML(html, {
    ...parseOptions,
    ...options
  });
