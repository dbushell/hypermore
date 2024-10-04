import {assertEquals} from 'jsr:@std/assert';
import {hypermore, globalProps} from './mod.ts';

Deno.test('props', async (test) => {
  await test.step('interpolation', async () => {
    const html = `<p>{{globalProps.number}}</p>`;
    const output = await hypermore.render(html);
    assertEquals(output, `<p>${globalProps.number}</p>`);
  });
  await test.step('escape apostrophe (global)', async () => {
    const html = `<p>{{globalProps.escapeApostrophe}}</p>`;
    const output = await hypermore.render(html);
    assertEquals(output, `<p>${globalProps.escapeApostropheEncoded}</p>`);
  });
  await test.step('encode entities (global)', async () => {
    const html = `<p>{{globalProps.entities}}</p>`;
    const output = await hypermore.render(html);
    assertEquals(output, `<p>${globalProps.encodedEntities}</p>`);
  });
  await test.step('escape apostrophe (prop)', async () => {
    const html = `<my-prop prop="{{globalProps.escapeApostrophe}}" />`;
    const output = await hypermore.render(html);
    assertEquals(output, `<p>${globalProps.escapeApostropheEncoded}</p>`);
  });
  await test.step('encode entities (prop)', async () => {
    const html = `<my-prop prop="{{globalProps.entities}}" />`;
    const output = await hypermore.render(html);
    assertEquals(output, `<p>${globalProps.encodedEntities}</p>`);
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
  await test.step('missing error', async () => {
    const html = `<p>{{ missing.join('') }}</p>`;
    try {
      await hypermore.render(html);
    } catch (err) {
      assertEquals(err.message.includes(`"missing is not defined"`), true);
      assertEquals(err.message.includes(`{{ missing.join('') }}`), true);
    }
  });
  await test.step('component missing prop', async () => {
    const html = `<my-prop />`;
    try {
      await hypermore.render(html);
    } catch (err) {
      assertEquals(err.message.includes(`expression: "{{prop}}"`), true);
      assertEquals(err.message.includes(`element: <my-prop>`), true);
    }
  });
});
