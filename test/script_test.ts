import {assertEquals} from 'jsr:@std/assert';
import {hypermore, warn} from './mod.ts';

Deno.test('<ssr-script> tag', async (test) => {
  await test.step('remove script', async () => {
    const html = `<ssr-script><p>Do <p>not <p>parse</ssr-script>`;
    const output = await hypermore.render(html);
    assertEquals(output, '');
  });
  warn.capture();
  await test.step('empty script', async () => {
    const html = `<ssr-script />`;
    const output = await hypermore.render(html);
    assertEquals(output, '');
    assertEquals(warn.stack.pop(), ['<ssr-script> with no content']);
  });
  warn.release();
});
