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
export type HypermoreOptions = {
  autoEscape?: boolean;
  globalProps?: Props;
  templates?: Map<string, string>;
};

/** Hypermore HTML tag extension */
export type HypermoreTag = {
  /** Custom tag name */
  tagName: string;
  /** Node tag matches the custom tag name */
  match: (node: string | Node) => boolean;
  /** Node is a valid instance of the custom tag */
  validate: (node: Node, context: Hypermore) => boolean;
  /** Node to HTML string */
  render: (node: Node, context: Hypermore) => Promise<string>;
};
