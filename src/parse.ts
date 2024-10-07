import {
  type ParseOptions,
  escapeApostrophe,
  escape,
  unescape,
  getParseOptions,
  inlineTags,
  Node,
  parseHTML as originalParseHTML
} from '@dbushell/hyperless';

export {escapeApostrophe, escape, unescape, inlineTags, Node};

// Extend defaults with special tags
const parseOptions = getParseOptions();
parseOptions.voidTags.add('ssr-else');
parseOptions.voidTags.add('ssr-elseif');
parseOptions.opaqueTags.add('ssr-script');

/** Parse HTML text into Node tree */
export const parseHTML = (
  html: string,
  options?: Partial<ParseOptions>
): Node =>
  originalParseHTML(html, {
    ...parseOptions,
    ...options
  });
