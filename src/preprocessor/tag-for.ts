import type {RenderTag, Hypermore} from '../types.ts';
import {evaluateContext} from './evaluate.ts';
import {Node} from './parse.ts';
import {isVariable} from './utils.ts';

const tagName = 'for';

const match = (node: Node): boolean => node.tag === tagName;

const validate = (node: Node): boolean => {
  if (node.size === 0) {
    console.warn(`<for> missing statement`);
    return false;
  }
  if (node.attributes.has('of') === false) {
    console.warn(`<for> missing "of" property`);
    return false;
  }
  const itemProp = node.attributes.get('item');
  if (itemProp === undefined || isVariable(itemProp) === false) {
    console.warn(`<for> invalid "item" property`);
    return false;
  }
  const indexProp = node.attributes.get('index');
  if (indexProp && isVariable(indexProp) === false) {
    console.warn(`<for> invalid "index" property`);
    return false;
  }
  return true;
};

const render = async (
  node: Node,
  context: Hypermore
): Promise<string | undefined> => {
  const itemProp = node.attributes.get('item')!;
  const indexProp = node.attributes.get('index');

  // Parse "of" attribute
  const expression = node.attributes.get('of')!;
  let items = await evaluateContext<unknown>(expression, context);

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
    console.warn(`<for> invalid "of" property (not iterable)`);
    return;
  }

  // Move <for> children into template
  const template = new Node(null, 'INVISIBLE');
  template.append(...node.children);

  let i = 0;
  let out = '';
  for (const item of items as Iterable<unknown>) {
    const props = {...context.localProps, [itemProp]: JSON.stringify(item)};
    const clone = template.clone();
    node.append(clone);
    for (const child of clone.children) {
      if (indexProp) props[indexProp] = JSON.stringify(i);
      out += (await context.renderNode(child, props)) ?? '';
    }
    i++;
  }
  return out;
};

const RenderTag: RenderTag = {
  tagName,
  match,
  render,
  validate
};

export default RenderTag;
