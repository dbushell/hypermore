import {
  type ParseOptions,
  escape,
  unescape,
  inlineTags,
  Node,
  getParseOptions,
  parseHTML as originalParseHTML
} from '@dbushell/hyperless';

export {escape, unescape, inlineTags, Node};

// Extend defaults with custom tags
const parseOptions = getParseOptions();
parseOptions.voidTags.add('else');
parseOptions.voidTags.add('elseif');

// Wrap original with extended options
export const parseHTML = (
  html: string,
  options?: Partial<ParseOptions>
): Node =>
  originalParseHTML(html, {
    ...parseOptions,
    ...options
  });
