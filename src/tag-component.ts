import type {Environment, HyperTag, Node, Props} from './types.ts';
import {evaluateContext, evaluateText} from './evaluate.ts';

const match = (node: string | Node): boolean => {
  const tagName = typeof node === 'string' ? node : node.tag;
  // Disallow reserved prefix
  if (tagName.startsWith('ssr-')) return false;
  // Match custom element naming pattern
  return /([a-z][\w]*-[\w]+)/.test(tagName);
};

// Already cloned, or template exists for tag name
const validate = (node: Node, env: Environment): boolean =>
  env.ctx.hasComponent(node) || env.ctx.hasTemplate(node.tag);

const render = async (node: Node, env: Environment): Promise<string> => {
  // Ignore custom elements with no template
  if (validate(node, env) === false) {
    return env.ctx.renderParent(node, env);
  }
  // Ignore elements within <ssr-html> block
  const parent = node.closest((n) => n.tag === 'ssr-html');
  if (parent) {
    return env.ctx.renderParent(node, env);
  }

  const slots = new Map<string, Node>();
  const targets = new Map<Node, string>();
  const fragments = new Set<Node>();
  const cleared = new Set<Node>();

  const template = env.ctx.cloneTemplate(node.tag, env)!;
  template.type = 'INVISIBLE';
  template.raw = node.tag;

  template.traverse((n) => {
    if (match(n)) return false;
    if (n.tag === 'ssr-slot') {
      const name = n.attributes.get('name');
      slots.set(name ?? 'default', n);
    }
  });

  node.traverse((n) => {
    if (match(n)) return false;
    if (n.tag === 'ssr-fragment') {
      fragments.add(n);
      const slot = n.attributes.get('slot')!;
      if (slot) {
        n.children.forEach((c) => targets.set(c, slot));
      }
    }
  });

  if (node.size && slots.has('default')) {
    node.children.forEach((n) => {
      if (n.tag === 'ssr-fragment') return;
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
  let props: Props = {...env.localProps.at(-1)};
  for (const [key, value] of node.attributes) {
    const [newValue, vars] = await evaluateText(value, env);
    node.attributes.set(key, newValue);
    // Preserve type of singular expression
    const single = /^\s*{{.+}}\s*$/.test(value);
    props[key] = single ? vars[0] : newValue;
  }

  node.clear();
  node.replace(template);

  // Find component script that can return props
  const script = template.find((n) => {
    return (
      n.tag === 'ssr-script' && n.attributes.get('context') === 'component'
    );
  });
  if (script) {
    script.detach();
    let code = script.at(0)!.raw;
    code = code.replace(/^\s*<script([^>]*>)/, '');
    code = code.replace(/<\/script>\s*/, '');
    const mod = await evaluateContext<{
      defaultProps?: Props;
      localProps?: Props;
    }>(code, env, props, false);
    if (typeof mod.defaultProps === 'object') {
      props = {
        ...mod.defaultProps,
        ...props
      };
    }
    if (typeof mod.localProps === 'object') {
      props = {
        ...props,
        ...mod.localProps
      };
    }
  }

  // Avoid infinite loops
  const nested = new Set<Node>();
  template.traverse((n) => {
    if (n.tag === 'ssr-if' || n.tag === 'ssr-for') return false;
    if (n.tag === node.tag) nested.add(n);
  });
  if (nested.size) {
    nested.forEach((n) => n.detach());
    console.warn(`<${node.tag}> infinite nested loop`);
  }

  return env.ctx.renderNode(template, env, props);
};

const Tag: HyperTag = {
  tagName: 'ssr-component',
  match,
  render,
  validate
};

export default Tag;
