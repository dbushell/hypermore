import {assertEquals} from 'jsr:@std/assert';
import {hypermore, warn} from './mod.ts';

Deno.test('<for> tag', async (test) => {
  warn.capture();
  await test.step('void statement', async () => {
    const html = `<for />`;
    const output = await hypermore.render(html);
    assertEquals(output, '');
    assertEquals(warn.stack.pop(), ['<for> with no statement']);
  });
  await test.step('empty statement', async () => {
    const html = `<for></for>`;
    const output = await hypermore.render(html);
    assertEquals(output, '');
    assertEquals(warn.stack.pop(), ['<for> with no statement']);
  });
  await test.step('missing "of" property', async () => {
    const html = `<for>Fail!</for>`;
    const output = await hypermore.render(html);
    assertEquals(output, '');
    assertEquals(warn.stack.pop(), ['<for> missing "of" property']);
  });
  await test.step('missing "item" property', async () => {
    const html = `<for of="5">Fail!</for>`;
    const output = await hypermore.render(html);
    assertEquals(output, '');
    assertEquals(warn.stack.pop(), ['<for> invalid "item" property']);
  });
  await test.step('invalid "item" property', async () => {
    const html = `<for item="!!" of="5">Fail!</for>`;
    const output = await hypermore.render(html);
    assertEquals(output, '');
    assertEquals(warn.stack.pop(), ['<for> invalid "item" property']);
  });
  await test.step('invalid "index" property', async () => {
    const html = `<for index="!!" item="item" of="5">Fail!</for>`;
    const output = await hypermore.render(html);
    assertEquals(output, '');
    assertEquals(warn.stack.pop(), ['<for> invalid "index" property']);
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
  warn.release();
});
