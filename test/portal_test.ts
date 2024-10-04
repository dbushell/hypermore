import {assertEquals} from 'jsr:@std/assert';
import {hypermore, warn} from './mod.ts';

Deno.test('portals', async (test) => {
  warn.capture();
  await test.step('missing name', async () => {
    const html = `<portal />`;
    const output = await hypermore.render(html);
    assertEquals(output, ``);
    assertEquals(warn.stack.pop(), ['<portal> missing "name" property']);
  });
  await test.step('fragment before', async () => {
    const html = `<fragment portal="head">Before!</fragment><portal name="head" /> End!`;
    const output = await hypermore.render(html);
    assertEquals(output, `Before! End!`);
  });
  await test.step('fragment after', async () => {
    const html = `<portal name="head" /> End!<fragment portal="head">After!</fragment>`;
    const output = await hypermore.render(html);
    assertEquals(output, `After! End!`);
  });
  await test.step('inner content', async () => {
    const html = `<fragment portal="head">End!</fragment><portal name="head">Start! </portal>`;
    const output = await hypermore.render(html);
    assertEquals(output, `Start! End!`);
  });
  await test.step('missing name', async () => {
    const html = `<fragment portal="missing">Missing!</fragment><portal name="head" /> End!`;
    const output = await hypermore.render(html);
    assertEquals(output, ` End!`);
  });
  warn.release();
});
