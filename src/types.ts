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

export type Props = JSONObject;

export type Deferred<T> = ReturnType<typeof Promise.withResolvers<T>>;

export type HypermoreOptions = {
  autoEscape?: boolean;
  globalProps?: Props;
  templates?: Map<string, string>;
};

export type HypermoreTag = {
  tagName: string;
  match: (node: string | Node) => boolean;
  validate: (node: Node, context: Hypermore) => boolean;
  render: (node: Node, context: Hypermore) => Promise<string>;
};
