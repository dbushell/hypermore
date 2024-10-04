import {assertEquals} from 'jsr:@std/assert';
import {hypermore, globalProps, warn} from './mod.ts';

Deno.test('components', async (test) => {
  warn.capture();
  await test.step('basic import', async () => {
    const html = `<div><my-basic /></div>`;
    const output = await hypermore.render(html);
    assertEquals(output, `<div><main>Pass!</main></div>`);
  });
  await test.step('unknown import', async () => {
    const html = `<div><my-unknown>{{globalProps.number}}</my-unknown></div>`;
    const output = await hypermore.render(html);
    assertEquals(
      output,
      `<div><my-unknown>${globalProps.number}</my-unknown></div>`
    );
  });
  await test.step('infinite loop', async () => {
    const html = `<loop-slot>1<loop-slot>2<loop-slot>3</loop-slot></loop-slot></loop-slot>`;
    const output = await hypermore.render(html);
    assertEquals(output, `1`);
    assertEquals(warn.stack.pop(), ['<loop-slot> infinite nested loop']);
  });
  warn.release();
});
