/** List of tags to never render */
export const customTags = new Set([
  'else',
  'elseif',
  'fragment',
  'for',
  'if',
  'slot',
  'portal'
]);

/** Reserved property names */
export const reservedProps = new Set(['globalProps']);

/** Returns true if name is valid variable */
export const isVariable = (name: string): boolean => {
  return /^[a-zA-Z_$]\w*$/.test(name);
};

/** Return conventional component name from path */
export const componentName = (path: string | URL): string => {
  let name = path.toString();
  name = name.split('/').at(-1) ?? name;
  name = name.split('.', 1)[0];
  name = name.replace(/[^\w:-]/g, '');
  let parts = name.split('-');
  parts = parts.map(
    (part) =>
      part.charAt(0).toLocaleUpperCase() + part.slice(1).toLocaleLowerCase()
  );
  name = parts.join('');
  return name;
};
