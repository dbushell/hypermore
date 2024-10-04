import {assertEquals} from 'jsr:@std/assert';
import {hypermore} from './mod.ts';

Deno.test('slots', async (test) => {
  await test.step('void slot', async () => {
    const html = `<div><VoidSlot>Pass!</VoidSlot></div>`;
    const output = await hypermore.render(html);
    assertEquals(output, `<div><main>Pass!</main></div>`);
  });
  await test.step('fallback slot (empty)', async () => {
    const html = `<div><FallbackSlot /></div>`;
    const output = await hypermore.render(html);
    assertEquals(output, `<div><main>Fallack!</main></div>`);
  });
  await test.step('fallback slot (populated)', async () => {
    const html = `<div><FallbackSlot>Populated!</FallbackSlot></div>`;
    const output = await hypermore.render(html);
    assertEquals(output, `<div><main>Populated!</main></div>`);
  });
  await test.step('named slot (1)', async () => {
    const html = `<NamedSlot><fragment slot="start">Start!</fragment></NamedSlot>`;
    const output = await hypermore.render(html);
    assertEquals(output, `<main>Start! Center! </main>`);
  });
  await test.step('named slot (2)', async () => {
    const html = `<NamedSlot><fragment slot="start">Start!</fragment><fragment slot="end">End!</fragment></NamedSlot>`;
    const output = await hypermore.render(html);
    assertEquals(output, `<main>Start! Center! End!</main>`);
  });
  await test.step('named slot + unused', async () => {
    const html = `<NamedSlot><fragment slot="end">End!</fragment></NamedSlot>`;
    const output = await hypermore.render(html);
    assertEquals(output, `<main>Unused! Center! End!</main>`);
  });
  await test.step('named slot + default', async () => {
    const html = `<NamedSlot><fragment slot="start">Start!</fragment> Middle! <fragment slot="end">End!</fragment></NamedSlot>`;
    const output = await hypermore.render(html);
    assertEquals(output, `<main>Start! Middle! End!</main>`);
  });
  await test.step('named slot + props', async () => {
    const html = `<NamedSlot start="Start!" end="End!"><fragment slot="start">{{start}}</fragment><fragment slot="end">{{end}}</fragment></NamedSlot>`;
    const output = await hypermore.render(html);
    assertEquals(output, `<main>Start! Center! End!</main>`);
  });
});
