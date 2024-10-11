import {
  escape,
  getParseOptions,
  inlineTags,
  Node,
  parseHTML as originalParseHTML,
  type ParseOptions,
  unescape,
} from "@dbushell/hyperless";

export { escape, inlineTags, Node, unescape };

// Extend defaults with special tags
const parseOptions = getParseOptions();
parseOptions.voidTags.add("ssr-else");
parseOptions.voidTags.add("ssr-elseif");
parseOptions.opaqueTags.add("ssr-script");

/** Parse HTML text into Node tree */
export const parseHTML = (
  html: string,
  options?: Partial<ParseOptions>,
): Node =>
  originalParseHTML(html, {
    ...parseOptions,
    ...options,
  });
