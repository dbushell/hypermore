import {assertEquals} from 'jsr:@std/assert';
import {hypermore, globalProps, warn} from './mod.ts';

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
