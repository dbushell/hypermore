import { assertEquals } from "jsr:@std/assert";
import { hypermore } from "./mod.ts";

Deno.test("slots", async (test) => {
  await test.step("void slot", async () => {
    const html = `<div><void-slot>Pass!</void-slot></div>`;
    const output = await hypermore.render(html);
    assertEquals(output, `<div><main>Pass!</main></div>`);
  });
  await test.step("fallback slot (empty)", async () => {
    const html = `<div><fallback-slot /></div>`;
    const output = await hypermore.render(html);
    assertEquals(output, `<div><main>Fallack!</main></div>`);
  });
  await test.step("fallback slot (populated)", async () => {
    const html = `<div><fallback-slot>Populated!</fallback-slot></div>`;
    const output = await hypermore.render(html);
    assertEquals(output, `<div><main>Populated!</main></div>`);
  });
  await test.step("named slot (1)", async () => {
    const html =
      `<named-slot><ssr-fragment slot="start">Start!</fragment></named-slot>`;
    const output = await hypermore.render(html);
    assertEquals(output, `<main>Start! Center! </main>`);
  });
  await test.step("named slot (2)", async () => {
    const html =
      `<named-slot><ssr-fragment slot="start">Start!</fragment><ssr-fragment slot="end">End!</fragment></named-slot>`;
    const output = await hypermore.render(html);
    assertEquals(output, `<main>Start! Center! End!</main>`);
  });
  await test.step("named slot + unused", async () => {
    const html =
      `<named-slot><ssr-fragment slot="end">End!</fragment></named-slot>`;
    const output = await hypermore.render(html);
    assertEquals(output, `<main>Unused! Center! End!</main>`);
  });
  await test.step("named slot + default", async () => {
    const html =
      `<named-slot><ssr-fragment slot="start">Start!</fragment> Middle! <ssr-fragment slot="end">End!</fragment></named-slot>`;
    const output = await hypermore.render(html);
    assertEquals(output, `<main>Start! Middle! End!</main>`);
  });
  await test.step("named slot + props", async () => {
    const html =
      `<named-slot start="Start!" end="End!"><ssr-fragment slot="start">{{start}}</fragment><ssr-fragment slot="end">{{end}}</fragment></named-slot>`;
    const output = await hypermore.render(html);
    assertEquals(output, `<main>Start! Center! End!</main>`);
  });
});
