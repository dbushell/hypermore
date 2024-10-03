import type {Adapter} from '../types.ts';
import fs from 'node:fs/promises';

const adapter: Adapter = {
  readTextFile: (path: string | URL): Promise<string> => {
    return fs.readFile(path, {encoding: 'utf8'});
  }
};

export default adapter;
