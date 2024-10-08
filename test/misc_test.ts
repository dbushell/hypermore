import {assertEquals} from 'jsr:@std/assert';
import {hypermore} from './mod.ts';

Deno.test('misc', async (test) => {
  await test.step('inline svg', async () => {
    const html = `<svg viewbox="0 0 100 200" width="100" height="200">
  <circle cx="10" cy="10" r="10" fill="red"/>
</svg>`;
    const output = await hypermore.render(html);
    assertEquals(output, html);
  });
  await test.step('inline style', async () => {
    const html = `<style>
:root {
  background: red;
}
</style>`;
    const output = await hypermore.render(html);
    assertEquals(output, html);
  });
  await test.step('inline script', async () => {
    const html = `<script type="text/javascript">
alert('Fail!');
Deno.exit(1);
</script>`;
    const output = await hypermore.render(html);
    assertEquals(output, html);
  });
  await test.step('html comment', async () => {
    const html = `<!-- comment -->`;
    const output = await hypermore.render(html);
    assertEquals(output, html);
  });
});
