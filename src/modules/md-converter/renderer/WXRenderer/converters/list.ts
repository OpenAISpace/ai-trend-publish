import { Theme } from "@src/modules/md-converter/themes/types.ts";
import {
  ConverterFunc,
  MarkdownElement,
} from "@src/modules/md-converter/types/index.ts";
import { makeStyleText } from "@src/modules/md-converter/utils/styles.ts";

export const listConverter: ConverterFunc<MarkdownElement.List> = (
  styles: Theme,
  body: string,
  ordered: boolean,
  _start: number,
) => {
  body = body.replace(/<\/*p.*?>/g, "");
  const segments = body.split(`<%s/>`);
  if (!ordered) {
    body = segments.join("â€?");
    return `<ul style="${makeStyleText(styles.list.ul)}">${body}</ul>`;
  }
  body = segments[0];
  for (let i = 1; i < segments.length; i++) {
    body = body + i + ". " + segments[i];
  }
  return `<ol style="${makeStyleText(styles.list.ol)}">${body}</ol>`;
};

export const listConverterFactory = (styles: Theme) => {
  return (body: string, ordered: boolean, start: number) =>
    listConverter(styles, body, ordered, start);
};
