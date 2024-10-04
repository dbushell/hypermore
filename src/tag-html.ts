import type {HypermoreTag, Hypermore, Node} from './types.ts';

const tagName = 'ssr-html';

const match = (node: string | Node): boolean =>
  (typeof node === 'string' ? node : node.tag) === tagName;

const validate = (node: Node): boolean => {
  if (node.size === 0) {
    console.warn(`<ssr-html> with no statement`);
    return false;
  }
  return true;
};

const render = async (node: Node, context: Hypermore): Promise<string> => {
  // Disable auto escape and re-renable to previous state later
  const autoEscape = context.autoEscape;
  context.autoEscape = false;
  const out = await context.renderChildren(node);
  context.autoEscape = autoEscape;
  return out;
};

const HypermoreTag: HypermoreTag = {
  tagName,
  match,
  render,
  validate
};

export default HypermoreTag;
