import {assertEquals} from 'jsr:@std/assert';
import {hypermore, warn} from './mod.ts';

Deno.test('portals', async (test) => {
  warn.capture();
  await test.step('missing name', async () => {
    const html = `<ssr-portal />`;
    const output = await hypermore.render(html);
    assertEquals(output, ``);
    assertEquals(warn.stack.pop(), ['<ssr-portal> missing "name" property']);
  });
  await test.step('fragment before', async () => {
    const html = `<ssr-fragment portal="head">Before!</fragment><ssr-portal name="head" /> End!`;
    const output = await hypermore.render(html);
    assertEquals(output, `Before! End!`);
  });
  await test.step('fragment after', async () => {
    const html = `<ssr-portal name="head" /> End!<ssr-fragment portal="head">After!</fragment>`;
    const output = await hypermore.render(html);
    assertEquals(output, `After! End!`);
  });
  await test.step('inner content', async () => {
    const html = `<ssr-fragment portal="head">End!</fragment><ssr-portal name="head">Start! </portal>`;
    const output = await hypermore.render(html);
    assertEquals(output, `Start! End!`);
  });
  await test.step('missing name', async () => {
    const html = `<ssr-fragment portal="missing">Missing!</fragment><ssr-portal name="head" /> End!`;
    const output = await hypermore.render(html);
    assertEquals(output, ` End!`);
  });
  warn.release();
});
