import type {Node} from './preprocessor/parse.ts';
import type {Hypermore} from './preprocessor/mod.ts';

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

export type Adapter = {
  readTextFile: (path: string | URL) => Promise<string>;
};

export type RenderOptions = {
  adapter: Adapter;
  globalProps?: Props;
  templates?: Map<string, string | URL>;
};

export type RenderTag = {
  tagName: string;
  match: (node: Node) => boolean;
  validate: (node: Node, context: Hypermore) => boolean;
  render: (node: Node, context: Hypermore) => Promise<string | undefined>;
};
