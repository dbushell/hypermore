import type {Adapter} from '../types.ts';

const adapter: Adapter = {
  readTextFile: (path: string | URL): Promise<string> => {
    return Bun.file(path).text();
  }
};

export default adapter;
