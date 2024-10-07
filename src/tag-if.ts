import type {Hypermore, HypermoreTag} from './types.ts';
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
  // First <ssr-if> condition
  const expression = node.attributes.get('condition')!;

  // List of conditions to check in order
  const conditions = [{expression, statement: new Node(null, 'INVISIBLE')}];

  // Iterate over <ssr-if> child nodes
  // <ssr-else> and <ssr-elseif> are added as new conditions
  // All other nodes are appended to the last condition
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
      let expression = child.attributes.get('condition');
      if (expression === undefined) {
        console.warn(`<ssr-elseif> with invalid condition`);
        expression = 'false';
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

  // Render first matching condition
  for (const {expression, statement} of conditions) {
    const result = await evaluateContext(expression, context);
    if (Boolean(result) === false) continue;
    node.replace(statement);
    return context.renderChildren(statement);
  }

  // No matches
  node.detach();
  return '';
};

const Tag: HypermoreTag = {
  tagName,
  match,
  render,
  validate
};

export default Tag;
