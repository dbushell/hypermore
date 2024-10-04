import type {HypermoreTag, Hypermore} from './types.ts';
import {evaluateContext} from './evaluate.ts';
import {Node} from './parse.ts';

const tagName = 'ssr-if';

const match = (node: string | Node): boolean =>
  (typeof node === 'string' ? node : node.tag) === tagName;

const validate = (node: Node): boolean => {
  if (node.size === 0) {
    console.warn(`<ssr-if> with no statement`);
    return false;
  }
  if (node.attributes.has('condition') === false) {
    console.warn(`<ssr-if> missing "condition" property`);
    return false;
  }
  return true;
};

const render = async (node: Node, context: Hypermore): Promise<string> => {
  const expression = node.attributes.get('condition')!;

  // Separate child nodes by secondary conditions
  const conditions: Array<{expression: string; statement: Node}> = [
    {expression, statement: new Node(null, 'INVISIBLE')}
  ];

  for (const child of [...node.children]) {
    child.detach();
    if (child.tag === 'ssr-else') {
      conditions.push({
        expression: 'true',
        statement: new Node(null, 'INVISIBLE')
      });
      continue;
    }
    if (child.tag === 'ssr-elseif') {
      const expression = child.attributes.get('condition');
      if (expression === undefined) {
        console.warn(`<ssr-elseif> with invalid condition`);
        return '';
      }
      conditions.push({
        expression,
        statement: new Node(null, 'INVISIBLE')
      });
      continue;
    }
    // Append to last condition
    conditions.at(-1)?.statement.append(child);
  }

  node.detach();

  // Output first matching condition
  for (const {expression, statement} of conditions) {
    const result = await evaluateContext(expression, context);
    if (result) {
      node.replace(statement);
      return context.renderChildren(statement);
    }
  }
  return '';
};

const HypermoreTag: HypermoreTag = {
  tagName,
  match,
  render,
  validate
};

export default HypermoreTag;
