import hljs from "highlight.js";
import { Theme } from "@src/modules/md-converter/themes/types.ts";
import {
  ConverterFunc,
  MarkdownElement,
} from "@src/modules/md-converter/types/index.ts";
import { makeStyleText } from "@src/modules/md-converter/utils/index.ts";

export const codeConverter: ConverterFunc<MarkdownElement.Code> = (
  styles: Theme,
  text: string,
  lang: string,
) => {
  lang = hljs.getLanguage(lang) ? lang : "plaintext";

  text = hljs.highlight(text, { language: lang }).value;

  text = text
    .replace(/\r\n/g, "<br/>")
    .replace(/\n/g, "<br/>")
    .replace(/(>[^<]+)|(^[^<]+)/g, (str) => {
      return str.replace(/\s/g, "&nbsp;");
    });

  return `<pre class="hljs code__pre" style="${
    makeStyleText(
      styles.code.pre,
    )
  }"><code class="prettyprint language-${lang}" style="${
    makeStyleText(
      styles.code.code,
    )
  }">${text}</code></pre>`;
};

export const codeConverterFactory = (styles: Theme) => {
  return (text: string, lang: string) => codeConverter(styles, text, lang);
};
