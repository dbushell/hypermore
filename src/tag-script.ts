import type {HyperTag, Node} from './types.ts';

const tagName = 'ssr-script';

const match = (node: string | Node): boolean =>
  (typeof node === 'string' ? node : node.tag) === tagName;

const validate = (node: Node): boolean => {
  if (node.size === 0) {
    console.warn(`<ssr-script> with no content`);
    return false;
  }
  return true;
};

const render = () => Promise.resolve();

const Tag: HyperTag = {
  tagName,
  match,
  render,
  validate
};

export default Tag;
