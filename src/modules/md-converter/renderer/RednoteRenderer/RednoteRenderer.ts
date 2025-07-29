import { Renderer } from "marked";
import { BaseRenderer } from "@src/modules/md-converter/renderer/BaseRenderer/BaseRenderer.ts";
import { codeConverterFactory } from "@src/modules/md-converter/renderer/RednoteRenderer/converters/code.ts";
import { codespanConverterFactory } from "@src/modules/md-converter/renderer/RednoteRenderer/converters/codespan.ts";
import { emConverterFactory } from "@src/modules/md-converter/renderer/RednoteRenderer/converters/em.ts";
import { headingConverterFactory } from "@src/modules/md-converter/renderer/RednoteRenderer/converters/heading.ts";
import { hrConverterFactory } from "@src/modules/md-converter/renderer/RednoteRenderer/converters/hr.ts";
import { linkConverterFactory } from "@src/modules/md-converter/renderer/RednoteRenderer/converters/link.ts";
import { listConverterFactory } from "@src/modules/md-converter/renderer/RednoteRenderer/converters/list.ts";
import { listItemConverterFactory } from "@src/modules/md-converter/renderer/RednoteRenderer/converters/listItem.ts";
import { paragraphConverterFactory } from "@src/modules/md-converter/renderer/RednoteRenderer/converters/paragraph.ts";
import { strongConverterFactory } from "@src/modules/md-converter/renderer/RednoteRenderer/converters/strong.ts";

export class RednoteRenderer extends BaseRenderer {
  override assemble(): Partial<Renderer> {
    return {
      em: emConverterFactory(this.theme),
      heading: headingConverterFactory(this.theme),
      hr: hrConverterFactory(this.theme),
      link: linkConverterFactory(this.theme, {}),
      list: listConverterFactory(this.theme),
      listitem: listItemConverterFactory(this.theme),
      paragraph: paragraphConverterFactory(this.theme),
      code: codeConverterFactory(this.theme),
      codespan: codespanConverterFactory(this.theme),
      strong: strongConverterFactory(this.theme),
    };
  }
}
