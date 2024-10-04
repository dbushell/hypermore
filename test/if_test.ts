import {assertEquals} from 'jsr:@std/assert';
import {hypermore, warn} from './mod.ts';

Deno.test('<if> tag', async (test) => {
  warn.capture();
  await test.step('void statement', async () => {
    const html = `<if />`;
    const output = await hypermore.render(html);
    assertEquals(output, '');
    assertEquals(warn.stack.pop(), ['<if> with no statement']);
  });
  await test.step('empty statement', async () => {
    const html = `<if></if>`;
    const output = await hypermore.render(html);
    assertEquals(output, '');
    assertEquals(warn.stack.pop(), ['<if> with no statement']);
  });
  await test.step('missing condition', async () => {
    const html = `<if>Fail!</if>`;
    const output = await hypermore.render(html);
    assertEquals(output, '');
    assertEquals(warn.stack.pop(), ['<if> missing "condition" property']);
  });
  await test.step('true condition', async () => {
    const html = `<if condition="globalProps.number === 42">Pass!</if>`;
    const output = await hypermore.render(html);
    assertEquals(output, 'Pass!');
  });
  await test.step('false condition', async () => {
    const html = `<if condition="globalProps.number === 22">Fail!</if>`;
    const output = await hypermore.render(html);
    assertEquals(output, '');
  });
  await test.step('<else> condition', async () => {
    const html = `
<if condition="globalProps.number === 22">
  Fail!
<else>
  Pass!
</if>`;
    const output = await hypermore.render(html);
    assertEquals(output.trim(), 'Pass!');
  });
  await test.step('<elseif> condition', async () => {
    const html = `
<if condition="globalProps.number === 22">
  Fail 1
<elseif condition="globalProps.number === 32">
  Fail 2
<elseif condition="globalProps.number === 42">
  Pass!
<else>
  Fail 3
</if>`;
    const output = await hypermore.render(html);
    assertEquals(output.trim(), 'Pass!');
  });
  await test.step('<elseif> <else> condition', async () => {
    const html = `
<if condition="globalProps.number === 22">
  Fail 1
<elseif condition="globalProps.number === 32">
  Fail 2
<else>
  Pass!
</if>`;
    const output = await hypermore.render(html);
    assertEquals(output.trim(), 'Pass!');
  });
  warn.release();
});
