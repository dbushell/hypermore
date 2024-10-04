import {assertEquals} from 'jsr:@std/assert';
import {hypermore, warn} from './mod.ts';

Deno.test('components', async (test) => {
  warn.capture();
  await test.step('invalid import', async () => {
    const html = `<div><Unknown>Fail!</Unknown></div>`;
    const output = await hypermore.render(html);
    assertEquals(output, `<div></div>`);
    assertEquals(warn.stack.pop(), ['<Unknown> missing template']);
  });
  await test.step('basic import', async () => {
    const html = `<div><Basic /></div>`;
    const output = await hypermore.render(html);
    assertEquals(output, `<div><main>Pass!</main></div>`);
  });
  warn.release();
});
