import {Hypermore} from '../mod.ts';

export const globalProps = {
  number: 42,
  array: [1, 2, 3, 'a', 'b', 'c']
};

export const hypermore = new Hypermore({
  globalProps
});

hypermore.setTemplate('Basic', `<main>Pass!</main>`);
hypermore.setTemplate('VoidSlot', `<main><slot /></main>`);
hypermore.setTemplate('FallbackSlot', `<main><slot>Fallack!</slot></main>`);
hypermore.setTemplate(
  'NamedSlot',
  `<main><slot name="start">Unused!</slot><slot> Center! </slot><slot name="end" /></main>`
);

hypermore.setTemplate(
  'Button',
  `<button type="{{type}}"><span>{{label}}</span></button>`
);

const consoleWarn = console.warn;

const warnStack: Array<Parameters<typeof consoleWarn>> = [];

const captureWarn = () => {
  console.warn = (...data) => warnStack.push(data);
};

const releaseWarn = () => {
  console.warn = consoleWarn;
  while (warnStack.length) warnStack.pop();
};

export const warn = {
  capture: captureWarn,
  release: releaseWarn,
  stack: warnStack
};
