import type {Node, Hypermore, RenderTag} from '../types.ts';
import {evaluateText} from './evaluate.ts';

const tagName = 'Component';

const componentTypes = new Set(['ELEMENT', 'VOID']);

const match = (node: Node): boolean =>
  componentTypes.has(node.type) && /[A-Z][\w:-]*/.test(node.tagRaw);

const validate = (node: Node, context: Hypermore): boolean => {
  if (context.hasTemplate(node.tagRaw) === false) {
    console.warn(`unknown import "${node.tag}"`);
    return false;
  }
  /** @todo improve detection */
  const parent = node.closest((n) => n.tagRaw === node.tag.toUpperCase());
  if (parent) {
    console.warn(`infinite nested loop <${node.tagRaw}>`);
    return false;
  }
  return true;
};

const render = async (
  node: Node,
  context: Hypermore
): Promise<string | undefined> => {
  const slots = new Map<string, Node>();
  const targets = new Map<Node, string>();
  const fragments = new Set<Node>();
  const cleared = new Set<Node>();

  const template = context.cloneTemplate(node.tagRaw)!;
  template.type = 'INVISIBLE';

  template.traverse((n) => {
    if (match(n)) return false;
    if (n.tag === 'slot') {
      const name = n.attributes.get('name');
      slots.set(name ?? 'default', n);
    }
  });

  node.traverse((n) => {
    if (match(n)) return false;
    if (n.tag === 'fragment') {
      fragments.add(n);
      const slot = n.attributes.get('slot')!;
      if (slot) {
        n.children.forEach((c) => targets.set(c, slot));
      }
    }
  });

  const props: Record<string, string> = {};

  if (node.size && slots.has('default')) {
    node.children.forEach((n) => {
      if (n.tag === 'fragment') return;
      targets.set(n, 'default');
    });
  }

  for (const [target, name] of targets.entries()) {
    const slot = slots.get(name);
    if (slot === undefined) {
      target.detach();
      continue;
    }
    if (cleared.has(slot) === false) {
      cleared.add(slot);
      slot.clear();
    }
    slot.append(target);
  }

  fragments.forEach((n) => n.detach());

  // Setup component props and attributes
  for (const [key, value] of node.attributes) {
    const [newValue, vars] = await evaluateText(value, context);

    node.attributes.set(key, newValue);
    // Preserve type of singular expression
    const single = /^\s*{{.+}}\s*$/.test(value);
    props[key] = JSON.stringify(single ? vars[0] : newValue);
  }

  node.clear();
  node.replace(template);

  return context.renderNode(template, props);
};

const RenderTag: RenderTag = {
  tagName,
  match,
  render,
  validate
};

export default RenderTag;
