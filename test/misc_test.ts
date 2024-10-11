import { assertEquals } from "jsr:@std/assert";
import { hypermore } from "./mod.ts";

Deno.test("misc", async (test) => {
  await test.step("inline svg", async () => {
    const html = `<svg viewbox="0 0 100 200" width="100" height="200">
  <circle cx="10" cy="10" r="10" fill="red"/>
</svg>`;
    const output = await hypermore.render(html);
    assertEquals(output, html);
  });
  await test.step("inline style", async () => {
    const html = `<style>
:root {
  background: red;
}
</style>`;
    const output = await hypermore.render(html);
    assertEquals(output, html);
  });
  await test.step("inline script", async () => {
    const html = `<script type="text/javascript">
alert('Fail!');
\${test} \`
Deno.exit(1);
</script>`;
    const output = await hypermore.render(html);
    assertEquals(output, html);
  });
  await test.step("opaque tag attributes", async () => {
    const html =
      `<script data-test="{{'Pass!'}}" data-test2="1{{2}}3"></script>`;
    const output = await hypermore.render(html);
    assertEquals(
      output,
      `<script data-test="Pass!" data-test2="123"></script>`,
    );
  });
  await test.step("html comment", async () => {
    const html = `<!-- comment -->`;
    const output = await hypermore.render(html);
    assertEquals(output, html);
  });
  await test.step("escape grave text", async () => {
    const html = `{{html}}`;
    const output = await hypermore.render(html, {
      html: "console.log(`1`,`2`,${a});",
    });
    assertEquals(output, "console.log(`1`,`2`,${a});");
  });
  await test.step("escape grave script", async () => {
    const html = `<ssr-html>{{html}}</ssr-html>`;
    const output = await hypermore.render(html, {
      html: "<script>console.log(`1`,`2`,${a});</script>",
    });
    assertEquals(output, "<script>console.log(`1`,`2`,${a});</script>");
  });
  await test.step("escape grave prop", async () => {
    const html = `<my-html html="{{html}}" />`;
    const output = await hypermore.render(html, {
      html: "<script>console.log(`1`,`2`,${a});</script>",
    });
    assertEquals(output, "<script>console.log(`1`,`2`,${a});</script>");
  });
});
