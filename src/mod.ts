import type {Props, RenderOptions} from './types.ts';
import {Node, parseHTML} from './parse.ts';
import tagIf from './tag-if.ts';
import tagFor from './tag-for.ts';
import tagComponent from './tag-component.ts';
import {evaluateText} from './evaluate.ts';
import {customTags, encodeHash} from './utils.ts';

export class Hypermore {
  localProps: Props;
  globalProps: Props;
  #templates: Map<string, Node>;
  /** Discovered portal names and comment placeholders */
  #portals: Map<string, string>;
  /** Extracted fragments and their target portals */
  #fragments: Set<{html: string; portal: string}>;

  constructor(options: RenderOptions) {
    this.globalProps = structuredClone(options.globalProps ?? {});
    this.#templates = new Map();
    this.localProps = {};
    this.#portals = new Map();
    this.#fragments = new Set();
    options.templates?.forEach((html, name) => {
      this.setTemplate(name, html);
    });
  }

  /** Returns `true` if named template exists */
  hasTemplate(name: string): boolean {
    return this.#templates.has(name);
  }

  /**
   * Set template by component name
   * @param name Name must match [A-Z][\w:-]*
   * @param html HTML string
   */
  setTemplate(name: string, html: string): void {
    if (/[A-Z][\w:-]*/.test(name) === false) {
      throw new Error(`invalid template name`);
    }
    const node = parseHTML(html, {
      rootTag: /^\w+$/.test(name) ? name : undefined
    });
    this.#templates.set(name, node);
  }

  /** Duplicate named template node */
  async cloneTemplate(name: string): Promise<Node | undefined> {
    const template = this.#templates.get(name);
    if (template === undefined) return undefined;
    await this.parseNode(template);
    return template.clone();
  }

  /**
   * Render HTML from string template
   * - Options from class constructor are used
   * @param html Template string
   * @returns HTML string
   */
  async render(html: string): Promise<string> {
    // Reset previous renders
    this.#portals = new Map();
    this.#fragments = new Set();
    // Parse and validate template node
    const node = parseHTML(html);
    await this.parseNode(node);
    // Render root template node
    let render = await this.renderNode(node, {});
    // Replace portals with extracted fragments
    const fragments = [...this.#fragments.values()];
    for (const [name, comment] of this.#portals) {
      render = render.replace(comment, () =>
        fragments
          .map(({html, portal}) => (portal === name ? html : ''))
          .join('')
      );
    }
    return render;
  }

  /**
   * Perform validation and cleanup before render
   * - Invalid child nodes are removed
   * @param root Node to process
   */
  async parseNode(root: Node): Promise<void> {
    // Track nodes to remove after traversal
    const remove = new Set<Node>();
    await root.traverse(async (node) => {
      // Flag custom tags as invisible for render switch
      if (customTags.has(node.tag)) {
        node.type = 'INVISIBLE';
      }
      if (node.tag === 'fragment') {
        const slot = node.attributes.get('slot');
        const portal = node.attributes.get('portal');
        if (slot === undefined && portal === undefined) {
          console.warn(`<fragment> missing "slot" or "portal" property`);
          remove.add(node);
        }
      }
      if (node.tag === 'portal') {
        const name = node.attributes.get('name');
        if (name === undefined) {
          console.warn(`<portal> missing "name" property`);
          remove.add(node);
        } else {
          // Fragments may appear before or after this portal in the node tree
          // A temporary comment is replaced later with extracted fragments
          // Hash is used to avoid authored comment conflicts
          const comment = `<!--${await encodeHash(name)}-->`;
          node.append(new Node(node, 'COMMENT', comment));
          this.#portals.set(name, comment);
        }
      }
      if (tagIf.match(node)) {
        if (tagIf.validate(node, this) === false) {
          remove.add(node);
        }
      }
      if (tagFor.match(node)) {
        if (tagFor.validate(node, this) === false) {
          remove.add(node);
        }
      }
    });
    // Remove nodes that failed validation
    remove.forEach((node) => node.detach());
  }

  /**
   * Render Node to string
   * @param node Node to render
   * @param props Local component props
   * @returns
   */
  async renderNode(node: Node, props?: Props): Promise<string> {
    if (props) this.localProps = props;
    switch (node.type) {
      case 'COMMENT':
        return node.raw;
      case 'OPAQUE':
        return node.raw;
      case 'ROOT':
        return this.renderChildren(node);
      case 'STRAY':
        console.warn(`stray closing tag "${node.tag}"`);
        return '';
      case 'TEXT': {
        const [text] = await evaluateText(node.raw, this);
        return text;
      }
      case 'ELEMENT':
      case 'VOID':
        if (tagComponent.match(node)) {
          return tagComponent.render(node, this);
        }
        return this.renderParent(node);
      case 'INVISIBLE':
        switch (node.tag) {
          case 'else':
            console.warn(`<else> outside of <if>`);
            return '';
          case 'elseif':
            console.warn(`<elseif> outside of <if>`);
            return '';
          case 'if':
            return tagIf.render(node, this);
          case 'for':
            return tagFor.render(node, this);
          case 'fragment': {
            const portal = node.attributes.get('portal');
            if (portal) {
              const html = await this.renderChildren(node);
              this.#fragments.add({html, portal});
            } else {
              console.warn(`'<fragment> unknown`);
            }
            return '';
          }
          case 'slot':
            return this.renderChildren(node);
          case 'portal':
            return this.renderChildren(node);
        }
        return this.renderParent(node);
    }
  }

  /**
   * Render children of Node specified
   * @param node Node
   * @returns HTML string
   */
  async renderChildren(node: Node): Promise<string> {
    let out = '';
    for (const child of node.children) {
      out += await this.renderNode(child);
    }
    return out;
  }

  /**
   * Render Node as HTML element
   * @param node Node
   * @returns HTML string
   */
  async renderParent(node: Node): Promise<string> {
    // Evaluate attributes
    for (const [key, value] of node.attributes) {
      const [newValue] = await evaluateText(value, this);
      node.attributes.set(key, newValue);
    }
    // Render children between
    let out = node.tagOpen ?? '';
    out += await this.renderChildren(node);
    out += node.tagClose ?? '';
    return out;
  }
}
