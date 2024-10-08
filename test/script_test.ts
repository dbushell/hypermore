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
  await test.step('local props script', async () => {
    const date = '2024-10-08T12:01:23.728Z';
    const html = `<my-time date="${date}" />`;
    const output = await hypermore.render(html);
    assertEquals(output.trim(), `2024, October, Tuesday`);
  });
  await test.step('default props script', async () => {
    const html = `<my-default end="End" />`;
    const output = await hypermore.render(html);
    assertEquals(output.trim(), `Heading Description End`);
  });
});
