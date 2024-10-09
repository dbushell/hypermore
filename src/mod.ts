import type {Environment, Options, Props} from './types.ts';
import {Node, parseHTML} from './parse.ts';
import {evaluateText} from './evaluate.ts';
import {specialTags} from './utils.ts';
import tagIf from './tag-if.ts';
import tagFor from './tag-for.ts';
import tagHtml from './tag-html.ts';
import tagScript from './tag-script.ts';
import tagElement from './tag-element.ts';
import tagComponent from './tag-component.ts';

/** Hypermore class */
export class Hypermore {
  autoEscape: boolean;
  globalProps: Props;
  /** Cache of cloned template nodes */
  #components: WeakSet<Node>;
  /** Map of template name and parsed nodes */
  #templates: Map<string, Node>;

  constructor(options: Options = {}) {
    this.autoEscape = true;
    this.globalProps = {};
    this.#templates = new Map();
    this.#components = new WeakSet();
    if (options) this.setOptions(options);
  }

  /** Update options */
  setOptions(options: Options): void {
    if (typeof options.autoEscape === 'boolean') {
      this.autoEscape = options.autoEscape;
    }
    if (options.globalProps) {
      this.globalProps = structuredClone(options.globalProps);
    }
    options.templates?.forEach((html, name) => {
      this.setTemplate(name, html);
    });
  }

  /** Returns `true` if node is a cloned template */
  hasComponent(node: Node): boolean {
    return this.#components.has(node);
  }

  /** Returns `true` if named template exists */
  hasTemplate(name: string): boolean {
    return this.#templates.has(name);
  }

  /**
   * Set named template by HTML
   * @param name Custom element name
   * @param html HTML string
   */
  setTemplate(name: string, html: string): void {
    if (tagComponent.match(name) === false) {
      throw new Error(`invalid template name`);
    }
    const node = parseHTML(html, {
      rootTag: /^\w+$/.test(name) ? name : undefined
    });
    this.#templates.set(name, node);
  }

  /** Duplicate named template node */
  cloneTemplate(name: string, env: Environment): Node | undefined {
    const template = this.#templates.get(name);
    if (template === undefined) return undefined;
    const node = template.clone();
    this.#components.add(node);
    this.parseNode(node, env);
    return node;
  }

  /**
   * Render HTML from string template
   * @param html Template string
   * @returns HTML string
   */
  async render(
    html: string,
    props?: Props,
    options?: Options
  ): Promise<string> {
    if (options) this.setOptions(options);
    // Create new render env
    const env: Environment = {
      ctx: this,
      localProps: [{}],
      node: undefined,
      portals: new Map(),
      fragments: new Set()
    };
    // Parse and validate template node
    const node = parseHTML(html);
    this.parseNode(node, env);
    // Render root template node
    let render = await this.renderNode(node, env, props);
    // Replace portals with extracted fragments
    const fragments = [...env.fragments.values()];
    for (const [name, comment] of env.portals) {
      render = render.replace(comment, () =>
        fragments
          .map(({html, portal}) => (portal === name ? html : ''))
          .join('')
      );
    }
    return render;
  }

  /**
   * Validate tree and remove invalid child nodes
   * @param root Node
   */
  parseNode(root: Node, env: Environment): void {
    // Track nodes to remove after traversal
    const remove = new Set<Node>();
    root.traverse((node) => {
      // Flag special tags as invisible for render switch
      if (specialTags.has(node.tag)) {
        node.type = 'INVISIBLE';
      }
      // Return false so inner special tags are rendered as elements
      if (tagHtml.match(node)) {
        if (tagHtml.validate(node, env) === false) {
          remove.add(node);
        }
        return false;
      }
      if (tagScript.match(node)) {
        tagScript.validate(node, env);
        if (node.attributes.get('context') !== 'component') {
          remove.add(node);
        }
      }
      if (tagElement.match(node)) {
        if (tagElement.validate(node, env) === false) {
          remove.add(node);
        }
      }
      if (tagIf.match(node)) {
        if (tagIf.validate(node, env) === false) {
          remove.add(node);
        }
      }
      if (tagFor.match(node)) {
        if (tagFor.validate(node, env) === false) {
          remove.add(node);
        }
      }
      if (node.tag === 'ssr-fragment') {
        const slot = node.attributes.get('slot');
        const portal = node.attributes.get('portal');
        if (slot === undefined && portal === undefined) {
          console.warn(`<ssr-fragment> missing "slot" or "portal" property`);
          remove.add(node);
        }
      }
      if (node.tag === 'ssr-portal') {
        const name = node.attributes.get('name');
        if (name === undefined) {
          console.warn(`<ssr-portal> missing "name" property`);
          remove.add(node);
        } else {
          // Fragments may appear before or after this portal in the node tree
          // A temporary comment is replaced later with extracted fragments
          // Random UUID is used to avoid authored comment conflicts
          const comment = `<!--${crypto.randomUUID()}-->`;
          node.append(new Node(node, 'COMMENT', comment));
          env.portals.set(name, comment);
        }
      }
    });
    // Remove nodes that failed validation
    remove.forEach((node) => node.detach());
  }

  /**
   * Render Node to HTML
   * @param node Node
   * @param props Local props
   * @returns HTML string
   */
  async renderNode(
    node: Node,
    env: Environment,
    props?: Props
  ): Promise<string> {
    env.node = node;
    // Stack new props
    if (props) env.localProps.push(props);
    // Wrap return to unstack new props
    const out = (value = ''): string | Promise<string> => {
      if (props) env.localProps.pop();
      return value;
    };
    switch (node.type) {
      case 'COMMENT':
        return out(node.raw);
      case 'OPAQUE':
        return out(await this.renderParent(node, env));
      case 'ROOT':
        return out(await this.renderChildren(node, env));
      case 'STRAY':
        console.warn(`stray closing tag "${node.tag}"`);
        return out();
      case 'TEXT': {
        const [text] = await evaluateText(node.raw, env);
        return out(text);
      }
      case 'ELEMENT':
      case 'VOID':
        if (tagComponent.match(node)) {
          return out(await tagComponent.render(node, env));
        }
        return out(await this.renderParent(node, env));
      case 'INVISIBLE':
        switch (node.tag) {
          case 'ssr-script':
            console.warn(`<ssr-script> unknown`);
            return out();
          case 'ssr-else':
            console.warn(`<ssr-else> outside of <ssr-if>`);
            return out();
          case 'ssr-elseif':
            console.warn(`<ssr-elseif> outside of <ssr-if>`);
            return out();
          case 'ssr-if':
            return out(await tagIf.render(node, env));
          case 'ssr-for':
            return out(await tagFor.render(node, env));
          case 'ssr-html':
            return out(await tagHtml.render(node, env));
          case 'ssr-element':
            return out(await tagElement.render(node, env));
          case 'ssr-fragment': {
            const portal = node.attributes.get('portal');
            if (portal) {
              const html = await this.renderChildren(node, env);
              env.fragments.add({html, portal});
            } else {
              console.warn(`<ssr-fragment> unknown`);
            }
            return out();
          }
          case 'ssr-slot':
            return out(await this.renderChildren(node, env));
          case 'ssr-portal':
            return out(await this.renderChildren(node, env));
        }
        return out(await this.renderParent(node, env));
    }
  }

  /**
   * Render children of Node to HTML
   * @param node Node
   * @returns HTML string
   */
  async renderChildren(node: Node, env: Environment): Promise<string> {
    let out = '';
    for (const child of node.children) {
      out += await this.renderNode(child, env);
    }
    return out;
  }

  /**
   * Render parent Node to HTML
   * @param node Node
   * @returns HTML string
   */
  async renderParent(node: Node, env: Environment): Promise<string> {
    // Evaluate attributes
    for (const [key, value] of node.attributes) {
      const [newValue] = await evaluateText(value, env);
      node.attributes.set(key, newValue);
    }
    if (node.type === 'OPAQUE') {
      return node.toString();
    }
    // Render children between
    let out = node.tagOpen;
    out += await this.renderChildren(node, env);
    out += node.tagClose;
    return out;
  }
}
