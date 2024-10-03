import type {Adapter, Deferred, Node, Props, RenderOptions} from '../types.ts';
import {parseHTML} from './parse.ts';
import {customTags} from './utils.ts';
import tagIf from './tag-if.ts';
import tagFor from './tag-for.ts';
import tagComponent from './tag-component.ts';
import {evaluateText} from './evaluate.ts';

export class Hypermore {
  adapter: Adapter;
  localProps: Props;
  globalProps: Props;
  portals: Map<string, Node>;

  #loading: Deferred<boolean> | undefined;
  #templates: Map<string, Node>;

  constructor(options: RenderOptions) {
    this.adapter = options.adapter;
    this.localProps = {};
    this.globalProps = structuredClone(options.globalProps ?? {});
    this.portals = new Map();

    // Start loading templates
    this.#templates = new Map();
    if (options.templates) {
      this.#loadTemplates(options.templates);
    }
  }

  /** Resolves true once templates have loaded */
  get loading(): Promise<boolean> {
    return this.#loading?.promise ?? Promise.resolve(true);
  }

  /** Load and parse templates */
  async #loadTemplates(templates: Map<string, string | URL>): Promise<void> {
    this.#loading = Promise.withResolvers();
    for (const [name, path] of templates.entries()) {
      const text = await this.adapter.readTextFile(path);
      const node = parseHTML(text, {
        rootTag: /^\w+$/.test(name) ? name : undefined
      });
      this.preprocess(node);
      this.#templates.set(name, node);
    }
    this.#loading.resolve(true);
  }

  /** Returns `true` if named template is usable */
  hasTemplate(name: string): boolean {
    return this.#templates.has(name);
  }

  /** Return a clone of the named template */
  cloneTemplate(name: string): Node | undefined {
    const template = this.#templates.get(name);
    if (template === undefined) return undefined;
    return template.clone();
  }

  /**
   * Render HTML using root Node template
   * - Options from class constructor are used
   * @param path Path to template
   * @returns HTML string
   */
  async render(path: string | URL): Promise<string> {
    this.localProps = {};
    this.portals = new Map();
    // Wait for contructor templates to load
    await this.loading;
    // Ensure the template path provided has been loaded
    const name = path.toString();
    if (this.#templates.has(name) === false) {
      await this.#loadTemplates(new Map([[name, path]]));
    }
    const node = this.cloneTemplate(name)!;
    this.preprocess(node);
    const rendered = await this.renderNode(node);
    return rendered ?? '';
  }

  /**
   * Perform validation and cleanup before render
   * - Invalid child nodes are removed
   * @param root Node to process
   */
  preprocess(root: Node): void {
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
   * Render children of Node specified
   * @param node Node
   * @returns HTML string
   */
  async renderChildren(node: Node): Promise<string> {
    let out = '';
    for (const child of node.children) {
      out += (await this.renderNode(child)) ?? '';
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

  async renderNode(node: Node, props?: Props): Promise<string | undefined> {
    if (props) this.localProps = props;
    switch (node.type) {
      case 'COMMENT':
        return;
      case 'OPAQUE':
        return node.raw;
      case 'ROOT':
        return this.renderChildren(node);
      case 'STRAY':
        console.warn(`stray closing tag "${node.tag}"`);
        return;
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
          return;
        }
        if (node.tag === 'elseif') {
          console.warn(`<elseif> outside of <if>`);
          return;
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
}
