import type { Environment, JSONObject, Options } from "./types.ts";
import { Node, parseHTML } from "./parse.ts";
import {
  addVars,
  envFooter,
  envHeader,
  parseVars,
  renderEnv,
} from "./environment.ts";
import { escapeChars, specialTags } from "./utils.ts";
import tagIf from "./tag-if.ts";
import tagFor from "./tag-for.ts";
import tagHtml from "./tag-html.ts";
import tagScript from "./tag-script.ts";
import tagElement from "./tag-element.ts";
import tagComponent from "./tag-component.ts";

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
      throw new Error(`invalid template name`);
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
    };
    // Add global props object
    addVars({ globalProps: this.#globalProps }, [], env, false, false);
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
    return result.trim();
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
      if (node.tag === "ssr-fragment") {
        const slot = node.attributes.get("slot");
        const portal = node.attributes.get("portal");
        if (slot === undefined && portal === undefined) {
          console.warn(`<ssr-fragment> missing "slot" or "portal" property`);
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
    props?: JSONObject,
    script?: string,
  ): Promise<void> {
    env.node = node;
    // Start nested block scope
    env.code += "{\n";
    // Stack new props
    let updatedProps: JSONObject | undefined;
    if (props) {
      updatedProps = addVars(props, env.localProps, env);
      env.localProps.push(props);
    }
    if (script) {
      env.code += script + "\n";
    }
    // Wrap return to unstack new props
    const out = (value = ""): void => {
      if (value.length) env.code += `__EXPORT += \`${value}\`;\n`;
      // End nested block scope;
      env.code += "}\n";
      // Reset prop values
      if (props) {
        if (updatedProps && Object.keys(updatedProps).length) {
          addVars(updatedProps, env.localProps, env);
        }
        env.localProps.pop();
      }
    };
    switch (node.type) {
      case "COMMENT":
        return out(node.raw);
      case "OPAQUE":
        await this.renderParent(node, env);
        return out();
      case "ROOT":
        await this.renderChildren(node, env);
        return out();
      case "STRAY":
        console.warn(`stray closing tag "${node.tag}"`);
        return out();
      case "TEXT": {
        if (node.raw.length === 0) return out();
        if (/^\s*$/.test(node.raw)) {
          return out(node.raw.indexOf("\n") > -1 ? "\n" : " ");
        }
        return out(parseVars(node.raw, env.ctx.autoEscape));
      }
      case "ELEMENT":
      case "VOID":
        if (tagComponent.match(node)) {
          await tagComponent.render(node, env);
          return out();
        }
        await this.renderParent(node, env);
        return out();
      case "INVISIBLE":
        switch (node.tag) {
          case "ssr-script":
            console.warn(`<ssr-script> unknown`);
            return out();
          case "ssr-else":
            console.warn(`<ssr-else> outside of <ssr-if>`);
            return out();
          case "ssr-elseif":
            console.warn(`<ssr-elseif> outside of <ssr-if>`);
            return out();
          case "ssr-if":
            await tagIf.render(node, env);
            return out();
          case "ssr-for":
            await tagFor.render(node, env);
            return out();
          case "ssr-html":
            await tagHtml.render(node, env);
            return out();
          case "ssr-element":
            await tagElement.render(node, env);
            return out();
          case "ssr-fragment": {
            const portal = node.attributes.get("portal");
            if (portal) {
              env.code += `const __TMP = __EXPORT;\n`;
              env.code +=
                `__FRAGMENTS.add({portal: '${portal}', html: (() => {\n`;
              env.code += `let __EXPORT = '';\n`;
              await this.renderChildren(node, env);
              env.code += `return __EXPORT;\n`;
              env.code += `})()});\n`;
              env.code += `__EXPORT = __TMP;\n`;
            } else {
              console.warn(`<ssr-fragment> unknown`);
            }
            return out();
          }
          case "ssr-slot":
            await this.renderChildren(node, env);
            return out();
          case "ssr-portal":
            await this.renderChildren(node, env);
            return out();
        }
        await this.renderParent(node, env);
        return out();
    }
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
    // Evaluate attributes
    for (let [key, value] of node.attributes) {
      if (value.indexOf("{{") === -1) continue;
      let id = crypto.randomUUID();
      if (env.uuid) id = `\${${env.uuid}}-${id}`;
      value = parseVars(value, env.ctx.autoEscape);
      env.code += `__REPLACE.set(\`${id}\`, \`${value}\`);\n`;
      node.attributes.set(key, id);
    }
    if (node.type === "OPAQUE") {
      env.code += `__EXPORT += \`${escapeChars(node.toString())}\`;\n`;
      return;
    }
    // Render children between
    await this.renderNode(new Node(null, "TEXT", node.tagOpen), env);
    await this.renderChildren(node, env);
    await this.renderNode(new Node(null, "TEXT", node.tagClose), env);
  }
}
