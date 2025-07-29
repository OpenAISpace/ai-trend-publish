import { WXRenderer } from "../renderer/WXRenderer/WXRenderer.ts";
import { defaultTheme } from "../themes/default.ts";
import { marked } from "marked";
import { RednoteRenderer } from "../renderer/index.ts";

Deno.test("微信完整渲染测试", () => {
  const renderer = new WXRenderer({ theme: defaultTheme });
  const assemble = renderer.assemble();
  marked.use({ renderer: assemble });
  const content = Deno.readTextFileSync(
    "./src/modules/render/md-converter/tests/test.md",
  );

  const result = marked(content);
  console.log(result);
});

Deno.test("Rednote完整渲染测试", () => {
  const renderer = new RednoteRenderer({ theme: defaultTheme });
  const assemble = renderer.assemble();
  marked.use({ renderer: assemble });
  const content = Deno.readTextFileSync(
    "./src/modules/render/md-converter/tests/test.md",
  );
  const result = marked(content);
  console.log(result);
});
