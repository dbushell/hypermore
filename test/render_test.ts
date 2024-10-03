import {Hypermore} from '../mod.ts';
import {assertEquals} from 'jsr:@std/assert';

const globalProps = {
  number: 42,
  array: [1, 2, 3, 'a', 'b', 'c']
};

const hypermore = new Hypermore({
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
let warnStack: Array<Parameters<typeof consoleWarn>> = [];

const captureWarn = () => {
  console.warn = (...data) => warnStack.push(data);
};

const releaseWarn = () => {
  // console.log('Warnings:', ...warnStack);
  console.warn = consoleWarn;
  warnStack = [];
};

Deno.test('props', async (test) => {
  await test.step('interpolation', async () => {
    const html = `<p>{{globalProps.number}}</p>`;
    const output = await hypermore.render(html);
    assertEquals(output, `<p>${globalProps.number}</p>`);
  });
  await test.step('type preservation', async () => {
    const html = `<p>{{typeof globalProps.number}}</p>`;
    const output = await hypermore.render(html);
    assertEquals(output, `<p>number</p>`);
  });
  await test.step('expression', async () => {
    const html = `<p>{{globalProps.array.join('')}}</p>`;
    const output = await hypermore.render(html);
    assertEquals(output, `<p>123abc</p>`);
  });
});

Deno.test('components', async (test) => {
  captureWarn();
  await test.step('invalid import', async () => {
    const html = `<div><Unknown>Fail!</Unknown></div>`;
    const output = await hypermore.render(html);
    assertEquals(output, `<div></div>`);
    assertEquals(warnStack.at(-1), ['<Unknown> missing template']);
  });
  await test.step('basic import', async () => {
    const html = `<div><Basic /></div>`;
    const output = await hypermore.render(html);
    assertEquals(output, `<div><main>Pass!</main></div>`);
  });
  releaseWarn();
});
Deno.test('slots', async (test) => {
  await test.step('void slot', async () => {
    const html = `<div><VoidSlot>Pass!</VoidSlot></div>`;
    const output = await hypermore.render(html);
    assertEquals(output, `<div><main>Pass!</main></div>`);
  });
  await test.step('fallback slot (empty)', async () => {
    const html = `<div><FallbackSlot /></div>`;
    const output = await hypermore.render(html);
    assertEquals(output, `<div><main>Fallack!</main></div>`);
  });
  await test.step('fallback slot (populated)', async () => {
    const html = `<div><FallbackSlot>Populated!</FallbackSlot></div>`;
    const output = await hypermore.render(html);
    assertEquals(output, `<div><main>Populated!</main></div>`);
  });
  await test.step('named slot (1)', async () => {
    const html = `<NamedSlot><fragment slot="start">Start!</fragment></NamedSlot>`;
    const output = await hypermore.render(html);
    assertEquals(output, `<main>Start! Center! </main>`);
  });
  await test.step('named slot (2)', async () => {
    const html = `<NamedSlot><fragment slot="start">Start!</fragment><fragment slot="end">End!</fragment></NamedSlot>`;
    const output = await hypermore.render(html);
    assertEquals(output, `<main>Start! Center! End!</main>`);
  });
  await test.step('named slot + unused', async () => {
    const html = `<NamedSlot><fragment slot="end">End!</fragment></NamedSlot>`;
    const output = await hypermore.render(html);
    assertEquals(output, `<main>Unused! Center! End!</main>`);
  });
  await test.step('named slot + default', async () => {
    const html = `<NamedSlot><fragment slot="start">Start!</fragment> Middle! <fragment slot="end">End!</fragment></NamedSlot>`;
    const output = await hypermore.render(html);
    assertEquals(output, `<main>Start! Middle! End!</main>`);
  });
  await test.step('named slot + props', async () => {
    const html = `<NamedSlot start="Start!" end="End!"><fragment slot="start">{{start}}</fragment><fragment slot="end">{{end}}</fragment></NamedSlot>`;
    const output = await hypermore.render(html);
    assertEquals(output, `<main>Start! Center! End!</main>`);
  });
});

Deno.test('<if> tag', async (test) => {
  captureWarn();
  await test.step('void statement', async () => {
    const html = `<if />`;
    const output = await hypermore.render(html);
    assertEquals(output, '');
    assertEquals(warnStack.at(-1), ['<if> with no statement']);
  });
  await test.step('empty statement', async () => {
    const html = `<if></if>`;
    const output = await hypermore.render(html);
    assertEquals(output, '');
    assertEquals(warnStack.at(-1), ['<if> with no statement']);
  });
  await test.step('missing condition', async () => {
    const html = `<if>Fail!</if>`;
    const output = await hypermore.render(html);
    assertEquals(output, '');
    assertEquals(warnStack.at(-1), ['<if> missing "condition" property']);
  });
  await test.step('true condition', async () => {
    const html = `<if condition="globalProps.number === 42">Pass!</if>`;
    const output = await hypermore.render(html);
    assertEquals(output, 'Pass!');
  });
  await test.step('false condition', async () => {
    const html = `<if condition="globalProps.number === 22">Fail!</if>`;
    const output = await hypermore.render(html);
    assertEquals(output, '');
  });
  await test.step('<else> condition', async () => {
    const html = `
<if condition="globalProps.number === 22">
  Fail!
<else>
  Pass!
</if>`;
    const output = await hypermore.render(html);
    assertEquals(output.trim(), 'Pass!');
  });
  await test.step('<elseif> condition', async () => {
    const html = `
<if condition="globalProps.number === 22">
  Fail 1
<elseif condition="globalProps.number === 32">
  Fail 2
<elseif condition="globalProps.number === 42">
  Pass!
<else>
  Fail 3
</if>`;
    const output = await hypermore.render(html);
    assertEquals(output.trim(), 'Pass!');
  });
  await test.step('<elseif> <else> condition', async () => {
    const html = `
<if condition="globalProps.number === 22">
  Fail 1
<elseif condition="globalProps.number === 32">
  Fail 2
<else>
  Pass!
</if>`;
    const output = await hypermore.render(html);
    assertEquals(output.trim(), 'Pass!');
  });
  releaseWarn();
});

Deno.test('<for> tag', async (test) => {
  captureWarn();
  await test.step('void statement', async () => {
    const html = `<for />`;
    const output = await hypermore.render(html);
    assertEquals(output, '');
    assertEquals(warnStack.at(-1), ['<for> with no statement']);
  });
  await test.step('empty statement', async () => {
    const html = `<for></for>`;
    const output = await hypermore.render(html);
    assertEquals(output, '');
    assertEquals(warnStack.at(-1), ['<for> with no statement']);
  });
  await test.step('missing "of" property', async () => {
    const html = `<for>Fail!</for>`;
    const output = await hypermore.render(html);
    assertEquals(output, '');
    assertEquals(warnStack.at(-1), ['<for> missing "of" property']);
  });
  await test.step('missing "item" property', async () => {
    const html = `<for of="5">Fail!</for>`;
    const output = await hypermore.render(html);
    assertEquals(output, '');
    assertEquals(warnStack.at(-1), ['<for> invalid "item" property']);
  });
  await test.step('invalid "item" property', async () => {
    const html = `<for item="!!" of="5">Fail!</for>`;
    const output = await hypermore.render(html);
    assertEquals(output, '');
    assertEquals(warnStack.at(-1), ['<for> invalid "item" property']);
  });
  await test.step('invalid "index" property', async () => {
    const html = `<for index="!!" item="item" of="5">Fail!</for>`;
    const output = await hypermore.render(html);
    assertEquals(output, '');
    assertEquals(warnStack.at(-1), ['<for> invalid "index" property']);
  });
  await test.step('number range', async () => {
    const html = `<for item="n" of="3">{{n + 1}}</for>`;
    const output = await hypermore.render(html);
    assertEquals(output, '123');
  });
  await test.step('characters', async () => {
    const html = `<for item="n" of="'abc'">{{n}}</for>`;
    const output = await hypermore.render(html);
    assertEquals(output, 'abc');
  });
  await test.step('array', async () => {
    const html = `<for item="n" of="[1,2,3,'a','b','c']">{{n}}</for>`;
    const output = await hypermore.render(html);
    assertEquals(output, '123abc');
  });
  await test.step('array (global prop)', async () => {
    const html = `<for item="n" of="globalProps.array">{{n}}</for>`;
    const output = await hypermore.render(html);
    assertEquals(output, '123abc');
  });
  releaseWarn();
});
