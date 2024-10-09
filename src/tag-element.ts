import type {Environment, HyperTag, Node} from './types.ts';
import {evaluateText} from './evaluate.ts';

const tagName = 'ssr-element';

const match = (node: string | Node): boolean =>
  (typeof node === 'string' ? node : node.tag) === tagName;

const validate = (node: Node): boolean => {
  if (node.attributes.has('tag') === false) {
    console.warn(`<ssr-element> missing "tag" property`);
    return false;
  }
  return true;
};

const render = async (node: Node, env: Environment): Promise<string> => {
  let tag = node.attributes.get('tag')!;
  [tag] = await evaluateText(tag, env);
  let attributes = node.attributes.toString();
  attributes = attributes.replace(/\s*tag="[^"]+"\s*/, ' ');
  let out = `<${(tag + attributes).trim()}>`;
  out += await env.ctx.renderChildren(node, env);
  out += `</${tag}>`;
  return out;
};

const Tag: HyperTag = {
  tagName,
  match,
  render,
  validate
};

export default Tag;
