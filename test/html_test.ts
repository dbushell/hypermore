import {assertEquals} from 'jsr:@std/assert';
import {hypermore, globalProps} from './mod.ts';

Deno.test('<ssr-html> tag', async (test) => {
  await test.step('unescaped variable', async () => {
    const html = `<ssr-html>{{globalProps.entities}}</ssr-html>`;
    const output = await hypermore.render(html);
    assertEquals(output, globalProps.entities);
  });
  await test.step('unrendered component', async () => {
    const html = `<ssr-html><my-prop prop="test"/></ssr-html>`;
    const output = await hypermore.render(html);
    assertEquals(output, '<my-prop prop="test"/>');
  });
  await test.step('unrendered <ssr-if>', async () => {
    const html = `<ssr-html><ssr-if condition="true">{{globalProps.entities}}</ssr-if></ssr-html>`;
    const output = await hypermore.render(html);
    assertEquals(
      output,
      `<ssr-if condition="true">${globalProps.entities}</ssr-if>`
    );
  });
  await test.step('unrendered <ssr-fragment>', async () => {
    const html = `<ssr-html><ssr-fragment portal="head">{{globalProps.entities}}</ssr-fragment></ssr-html>`;
    const output = await hypermore.render(html);
    assertEquals(
      output,
      `<ssr-fragment portal="head">${globalProps.entities}</ssr-fragment>`
    );
  });
});