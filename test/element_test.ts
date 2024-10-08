import {assertEquals} from 'jsr:@std/assert';
import {hypermore, warn} from './mod.ts';

Deno.test('<ssr-element> tag', async (test) => {
  warn.capture();
  await test.step('missing tag', async () => {
    const html = `<ssr-element>Fail!</element>`;
    const output = await hypermore.render(html);
    assertEquals(output, '');
    assertEquals(warn.stack.pop(), ['<ssr-element> missing "tag" property']);
  });
  warn.release();
  await test.step('open and close tags', async () => {
    const html = `<ssr-element tag="h1">Pass!</element>`;
    const output = await hypermore.render(html);
    assertEquals(output, '<h1>Pass!</h1>');
  });
  await test.step('additional attributes', async () => {
    const html = `<ssr-element tag="h1" id="pass" data-test c=1 c=2>Pass!</element>`;
    const output = await hypermore.render(html);
    assertEquals(output, '<h1 id="pass" data-test c="2">Pass!</h1>');
  });
  await test.step('attribute expression', async () => {
    const html = `<ssr-element tag="{{tag}}">Pass!</element>`;
    const output = await hypermore.render(html);
    assertEquals(output, '<h1>Pass!</h1>');
  });
});
