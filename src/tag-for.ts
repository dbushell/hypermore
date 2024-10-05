import type {HypermoreTag, Hypermore, Props, JSONValue} from './types.ts';
import {evaluateContext} from './evaluate.ts';
import {Node} from './parse.ts';
import {isVariable} from './utils.ts';

const tagName = 'ssr-for';

const match = (node: string | Node): boolean =>
  (typeof node === 'string' ? node : node.tag) === tagName;

const validate = (node: Node): boolean => {
  if (node.size === 0) {
    console.warn(`<ssr-for> with no statement`);
    return false;
  }
  if (node.attributes.has('of') === false) {
    console.warn(`<ssr-for> missing "of" property`);
    return false;
  }
  const itemProp = node.attributes.get('item');
  if (itemProp === undefined || isVariable(itemProp) === false) {
    console.warn(`<ssr-for> invalid "item" property`);
    return false;
  }
  const indexProp = node.attributes.get('index');
  if (indexProp && isVariable(indexProp) === false) {
    console.warn(`<ssr-for> invalid "index" property`);
    return false;
  }
  return true;
};

const render = async (node: Node, context: Hypermore): Promise<string> => {
  const itemProp = node.attributes.get('item')!;
  const indexProp = node.attributes.get('index');

  // Parse "of" attribute
  const expression = node.attributes.get('of')!;
  let items = await evaluateContext(expression, context);

  // Convert string to numeric value
  if (typeof items === 'string') {
    const parseItems = Number.parseInt(items);
    if (isNaN(parseItems) === false) items = parseItems;
  }

  // Convert number to array, e.g. "5" iterates [0,1,2,3,4]
  if (typeof items === 'number') {
    items = [...Array(items).keys()];
  }

  // @ts-ignore ensure items is iterable
  if (typeof items[Symbol.iterator] !== 'function') {
    console.warn(`<ssr-for> invalid "of" property (not iterable)`);
    return '';
  }

  // Move <ssr-for> children into template
  const template = new Node(null, 'INVISIBLE');
  template.append(...node.children);

  // Render each item with individual props
  let out = '';
  for (const [i, item] of [...(items as Iterable<JSONValue>)].entries()) {
    const props = {...context.localProps, [itemProp]: item} as Props;
    const clone = template.clone();
    node.append(clone);
    for (const child of clone.children) {
      if (indexProp) props[indexProp] = i;
      out += (await context.renderNode(child, props)) ?? '';
    }
  }
  return out;
};

const HypermoreTag: HypermoreTag = {
  tagName,
  match,
  render,
  validate
};

export default HypermoreTag;
