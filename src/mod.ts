import type {Node, Props, RenderOptions} from './types.ts';
import {parseHTML} from './parse.ts';
import {customTags} from './utils.ts';
import tagIf from './tag-if.ts';
import tagFor from './tag-for.ts';
import tagComponent from './tag-component.ts';
import {evaluateText} from './evaluate.ts';

export class Hypermore {
  localProps: Props;
  globalProps: Props;
  portals: Map<string, Node>;
  #templates: Map<string, Node>;

  constructor(options: RenderOptions) {
    this.localProps = {};
    this.globalProps = structuredClone(options.globalProps ?? {});
    this.portals = new Map();
    this.#templates = new Map();
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
    this.parseNode(node);
    this.#templates.set(name, node);
  }

  /** Duplicate named template node */
  cloneTemplate(name: string): Node | undefined {
    const template = this.#templates.get(name);
    if (template === undefined) return undefined;
    return template.clone();
  }

  /**
   * Render HTML from string template
   * - Options from class constructor are used
   * @param html Template string
   * @returns HTML string
   */
  render(html: string): Promise<string> {
    this.localProps = {};
    this.portals = new Map();
    const node = parseHTML(html);
    // console.log(node);
    this.parseNode(node);
    return this.renderNode(node, {});
  }

  /**
   * Perform validation and cleanup before render
   * - Invalid child nodes are removed
   * @param root Node to process
   */
  parseNode(root: Node): void {
    // Track nodes to remove after traversal
    const remove = new Set<Node>();
    root.traverse((node) => {
      // Flag custom tags as invisible for render switch
      if (customTags.has(node.tag)) {
        node.type = 'INVISIBLE';
      }
      if (node.tag === 'fragment') {
        const slot = node.attributes.get('slot');
        if (slot === undefined) {
          console.warn(`<fragment> missing "slot" property`);
          remove.add(node);
        }
      }
      if (node.tag === 'portal') {
        const name = node.attributes.get('name');
        if (name === undefined) {
          console.warn(`<portal> missing "name" property`);
          remove.add(node);
        } else {
          this.portals.set(name, node);
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
        return '';
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
        if (node.tag === 'else') {
          console.warn(`<else> outside of <if>`);
          return '';
        }
        if (node.tag === 'elseif') {
          console.warn(`<elseif> outside of <if>`);
          return '';
        }
        if (node.tag === 'if') {
          return tagIf.render(node, this);
        }
        if (node.tag === 'for') {
          return tagFor.render(node, this);
        }
        if (node.tag === 'slot') {
          return this.renderChildren(node);
        }
        if (node.tag === 'fragment') {
          console.log(`FRAGMENT`);
          return '';
        }
        if (node.tag === 'portal') {
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
