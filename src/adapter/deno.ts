import type {Adapter} from '../types.ts';

const adapter: Adapter = {
  readTextFile: (path: string | URL): Promise<string> => {
    return Deno.readTextFile(path);
  }
};

export default adapter;
