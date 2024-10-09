import type {Node} from './parse.ts';
import type {Hypermore} from './mod.ts';

export type {Node, Hypermore};

export type JSONValue =
  | boolean
  | number
  | null
  | string
  | JSONArray
  | JSONObject;

export type JSONArray = Array<JSONValue>;

export interface JSONObject {
  [key: string]: JSONValue;
}

/** Local and global props type */
export type Props = JSONObject;

/** Hypermore class configuration */
export type Options = {
  autoEscape?: boolean;
  globalProps?: Props;
  templates?: Map<string, string>;
};

/** Hypermore enviroment object */
export type Environment = {
  /** Current instance */
  ctx: Hypermore;
  /** Current local props */
  localProps: Array<Props>;
  /** Reference to current node rendering */
  node: Node | undefined;
  /** Discovered portal names and comment placeholders */
  portals: Map<string, string>;
  /** Extracted fragments and their target portals */
  fragments: Set<{html: string; portal: string}>;
};

/** Hypermore HTML tag extension */
export type HyperTag = {
  /** Custom tag name */
  tagName: string;
  /** Node tag matches the custom tag name */
  match: (node: string | Node) => boolean;
  /** Node is a valid instance of the custom tag */
  validate: (node: Node, env: Environment) => boolean;
  /** Node to HTML string */
  render: (node: Node, env: Environment) => Promise<string>;
};
