import type { Environment, JSONObject, Options } from "./types.ts";
import { Node, parseHTML } from "./parse.ts";
import {
  addVars,
  encodeVars,
  envFooter,
  envHeader,
  parseVars,
  renderEnv,
} from "./environment.ts";
import {
  escapeChars,
  renderTypes,
  reservedProps,
  specialTags,
  toCamelCase,
} from "./utils.ts";
import tagIf from "./tag-if.ts";
import tagFor from "./tag-for.ts";
import tagHtml from "./tag-html.ts";
import tagScript from "./tag-script.ts";
import tagElement from "./tag-element.ts";
import tagFragment from "./tag-fragment.ts";
import tagComponent from "./tag-component.ts";
import tagCache, { getCacheMap } from "./tag-cache.ts";

/** Hypermore class */
export class Hypermore {
  autoEscape: boolean;
  #globalProps: JSONObject;
  #templates: Map<string, Node>;

  constructor(options: Options = {}) {
    this.autoEscape = true;
    this.#globalProps = {};
    this.#templates = new Map();
    if (options) this.setOptions(options);
  }

  /** Update options */
  setOptions(options: Options): void {
    if (typeof options.autoEscape === "boolean") {
      this.autoEscape = options.autoEscape;
    }
    if (options.globalProps) {
      this.#globalProps = structuredClone(options.globalProps);
    }
    options.templates?.forEach((html, name) => {
      this.setTemplate(name, html);
    });
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
      throw new Error(`Invalid template name: "${name}"`);
    }
    const node = parseHTML(html, {
      rootTag: /^\w+$/.test(name) ? name : undefined,
    });
    this.#templates.set(name, node);
  }

  /** Duplicate named template node */
  cloneTemplate(name: string, env: Environment): Node | undefined {
    const template = this.#templates.get(name);
    if (template === undefined) return undefined;
    const node = template.clone();
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
    props?: JSONObject,
    options?: Options,
  ): Promise<string> {
    if (options) this.setOptions(options);
    // Create new render env
    const env: Environment = {
      code: envHeader,
      ctx: this,
      node: undefined,
      localProps: [],
      portals: new Map(),
      caches: new Map(),
    };
    // Add global props object
    addVars({ $global: this.#globalProps }, [], env, false);
    // Add destructured global props
    addVars(this.#globalProps, [], env, false);
    // Parse and validate template node
    const node = parseHTML(html);
    this.parseNode(node, env);
    // Render root template node
    await this.renderNode(node, env, props);
    // Replace portals with extracted fragments
    for (const [name, comment] of env.portals) {
      env.code += `__PORTALS.set('${name}', '${comment}');\n`;
    }
    env.code += envFooter;
    let result = "";
    try {
      result = await renderEnv(env);
    } catch (err) {
      console.error(err);
    }
    result = result.trim();
    // Extract cache element for later renders
    if (env.caches.size) {
      const map = getCacheMap(this);
      for (const [name, id] of env.caches) {
        const parts = result.split(`<!--[${id}]-->`);
        if (parts.length !== 3) {
          console.warn(`<ssr-cache name="${name}"> failed`);
          continue;
        }
        map.set(name, parts[1]);
      }
    }
    return result;
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
        node.type = "INVISIBLE";
      }
      // Return false so inner special tags are rendered as elements
      if (tagHtml.match(node)) {
        if (tagHtml.validate(node, env) === false) {
          remove.add(node);
        }
        return false;
      }
      if (tagCache.match(node)) {
        if (tagCache.validate(node, env) === false) {
          remove.add(node);
        }
      }
      if (tagScript.match(node)) {
        tagScript.validate(node, env);
        if (node.attributes.get("context") !== "component") {
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
      if (tagFragment.match(node)) {
        if (tagFragment.validate(node, env) === false) {
          remove.add(node);
        }
      }
      if (node.tag === "ssr-portal") {
        const name = node.attributes.get("name");
        if (name === undefined) {
          console.warn(`<ssr-portal> missing "name" property`);
          remove.add(node);
        } else {
          // Fragments may appear before or after this portal in the node tree
          // A temporary comment is replaced later with extracted fragments
          // Random UUID is used to avoid authored comment conflicts
          const comment = `<!--${crypto.randomUUID()}-->`;
          node.append(new Node(node, "COMMENT", comment));
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
    props: JSONObject = {},
    script?: string,
  ): Promise<void> {
    env.node = node;
    // Start nested block scope
    env.code += "{\n";
    // Validate new props
    const newProps: JSONObject = {};
    for (let [key, value] of Object.entries(props)) {
      key = toCamelCase(key);
      if (reservedProps.has(key)) {
        console.warn(`invalid prop "${key}" is reserved`);
      } else {
        newProps[key] = value;
      }
    }
    if (Object.keys(props).length) {
      newProps.$local = { ...newProps };
    }
    // Update props stack
    const updatedProps = addVars(newProps, env.localProps, env);
    env.localProps.push(newProps);
    // Append exports
    if (script) {
      env.code += script + "\n";
    }
    render: switch (node.type) {
      case "COMMENT":
        env.code += `__EXPORT += \`${escapeChars(node.raw)}\`;\n`;
        break render;
      case "OPAQUE":
        await this.renderParent(node, env);
        break render;
      case "ROOT":
        await this.renderChildren(node, env);
        break render;
      case "STRAY":
        console.warn(`stray closing tag "${node.tag}"`);
        break render;
      case "TEXT": {
        if (node.raw.length === 0) break render;
        let text = node.raw;
        if (/^\s*$/.test(text)) {
          text = text.indexOf("\n") > -1 ? "\n" : " ";
        } else {
          if (env.ctx.autoEscape) text = escapeChars(text);
          text = parseVars(text, env.ctx.autoEscape);
        }
        env.code += `__EXPORT += \`${text}\`;\n`;
        break render;
      }
      case "ELEMENT":
      case "VOID":
        if (tagComponent.match(node)) {
          await tagComponent.render(node, env);
          break render;
        }
        await this.renderParent(node, env);
        break render;
      case "INVISIBLE":
        switch (node.tag) {
          case "ssr-script":
            console.warn(`<ssr-script> unknown`);
            break render;
          case "ssr-else":
            console.warn(`<ssr-else> outside of <ssr-if>`);
            break render;
          case "ssr-elseif":
            console.warn(`<ssr-elseif> outside of <ssr-if>`);
            break render;
          case "ssr-if":
            await tagIf.render(node, env);
            break render;
          case "ssr-for":
            await tagFor.render(node, env);
            break render;
          case "ssr-html":
            await tagHtml.render(node, env);
            break render;
          case "ssr-cache":
            await tagCache.render(node, env);
            break render;
          case "ssr-element":
            await tagElement.render(node, env);
            break render;
          case "ssr-fragment":
            await tagFragment.render(node, env);
            break render;
          case "ssr-slot":
            await this.renderChildren(node, env);
            break render;
          case "ssr-portal":
            await this.renderChildren(node, env);
            break render;
        }
        await this.renderParent(node, env);
        break render;
    }
    // End nested block scope
    env.code += "}\n";
    // Reset prop values and stack
    if (updatedProps && Object.keys(updatedProps).length) {
      delete updatedProps["$local"];
      addVars(updatedProps, env.localProps, env);
    }
    env.localProps.pop();
  }

  /**
   * Render children of Node to HTML
   * @param node Node
   * @returns HTML string
   */
  async renderChildren(node: Node, env: Environment): Promise<void> {
    for (const child of node.children) {
      await this.renderNode(child, env);
    }
  }

  /**
   * Render parent Node to HTML
   * @param node Node
   * @returns HTML string
   */
  async renderParent(node: Node, env: Environment): Promise<void> {
    if (renderTypes.has(node.type)) {
      let tagOpen = node.tagOpen;
      // Parse attributes
      if (node.attributes.size) {
        tagOpen = `<${node.tag}\`+__ATTRIBUTES(__ATTR)+\``;
        tagOpen += node.type === "VOID" ? "/>" : ">";
        // Setup attribute callback
        env.code += `\nconst __ATTR = new Map();\n`;
        for (let [key, value] of node.attributes) {
          value = encodeVars(value, true);
          env.code += `try { __ATTR.set('${key}', ${value}); } catch {}\n`;
        }
      }
      const autoEscape = env.ctx.autoEscape;
      env.ctx.autoEscape = false;
      await this.renderNode(new Node(null, "TEXT", tagOpen), env);
      env.ctx.autoEscape = autoEscape;
    }
    if (node.type === "OPAQUE") {
      const out = node.children.map((n) => n.toString()).join("");
      env.code += `__EXPORT += \`${escapeChars(out)}\`;\n`;
    } else {
      await this.renderChildren(node, env);
    }
    if (renderTypes.has(node.type)) {
      await this.renderNode(new Node(null, "TEXT", node.tagClose), env);
    }
  }
}
