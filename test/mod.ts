import {Hypermore} from '../mod.ts';

const entities = new Map([
  ['&', '&amp;'],
  ['<', '&lt;'],
  ['>', '&gt;'],
  ['"', '&quot;'],
  ["'", '&#39;']
]);

export const globalProps = {
  tag: 'h1',
  number: 42,
  entities: [...entities.keys()].join(''),
  encodedEntities: [...entities.values()].join(''),
  escapeApostrophe: "It's It''s It'''s It\\'s It\\\\'s",
  escapeApostropheEncoded:
    'It&#39;s It&#39;&#39;s It&#39;&#39;&#39;s It\\&#39;s It\\\\&#39;s',
  array: [1, 2, 3, 'a', 'b', 'c']
};

export const hypermore = new Hypermore({
  globalProps
});

hypermore.setTemplate('my-prop', `<p>{{number}}</p>`);
hypermore.setTemplate('my-basic', `<main>Pass!</main>`);
hypermore.setTemplate('single-slot', `<ssr-slot />`);
hypermore.setTemplate('loop-slot', `<ssr-slot /><loop-slot />`);
hypermore.setTemplate('void-slot', `<main><ssr-slot /></main>`);
hypermore.setTemplate(
  'fallback-slot',
  `<main><ssr-slot>Fallack!</slot></main>`
);
hypermore.setTemplate(
  'named-slot',
  `<main><ssr-slot name="start">Unused!</slot><ssr-slot> Center! </slot><ssr-slot name="end" /></main>`
);
hypermore.setTemplate(
  'my-button',
  `<button type="{{type}}"><span>{{label}}</span></button>`
);
hypermore.setTemplate(
  'my-time',
  `<ssr-script context="component">
const newDate = new Date(date);
const year = newDate.getFullYear().toString();
const month = newDate.toLocaleString('en-GB', {month: 'long'});
const day = newDate.toLocaleString('en-GB', {weekday: 'long'});
return {
  localProps: {
    date: \`\${year}, \${month}, \${day}\`
  }
};
</ssr-script>
{{date}}
`
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
