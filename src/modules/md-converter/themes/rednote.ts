import { Theme } from "./types.ts";

export const rednoteTheme: Theme = {
  heading: {
    // 一级标题样�?
    h1: {
      "font-size": `21px`,
      "text-align": `left`,
      "font-weight": `bold`,
      margin: `15px 0 12px`,
      color: `#494E5E`,
      "font-family": `-apple-system`,
    },
    // 二级标题样式
    h2: {
      "font-size": `19px`,
      "line-height": `19px`,
      "text-align": `left`,
      "font-weight": `bold`,
      margin: `12px 0 8px`,
      padding: `0 6px`,
      "border-left": `4px solid #494E5E`,
      color: `#494E5E`,
      "font-family": `-apple-system`,
    },
    // 三级标题样式
    h3: {
      "font-weight": `bold`,
      "font-size": `17px`,
      margin: `8px 0 4px`,
      color: `#494E5E`,
    },
    // 四级标题样式
    h4: {
      "font-weight": `bold`,
      "font-size": `15px`,
      "text-align": `left`,
      color: `#494E5E`,
    },
  },
  paragraph: {
    margin: `6px 0`,
    "letter-spacing": `0.5px`,
    color: `#3f3f3f`,
    "font-size": `14px`,
    "line-height": `1.5`,
  },
  blockquoteParagraph: {
    "letter-spacing": `0.5px`,
    color: `rgb(80, 80, 80)`,
    display: `block`,
    "font-size": `15px`,
    "line-height": `1.75`,
  },
  list: {
    ol: {
      "list-style": "none",
      color: `#3f3f3f`,
    },
    ul: {
      "list-style": "none",
      color: `#3f3f3f`,
    },
  },
  listItem: {
    margin: `3px 8px 3px 0`,
    "letter-spacing": `0.5px`,
    color: `#3f3f3f`,
    "font-size": `14px`,
    "line-height": `1.5`,
    display: `flex`,
    "align-items": `start`,
  },
  listItemSymbol: {
    ol: {
      "margin-right": `4px`,
      "line-height": `1.5`,
    },
    ul: {
      "margin-right": `4px`,
      "line-height": `1`,
    },
  },
  quote: {
    "font-style": `normal`,
    "border-left": `none`,
    padding: `0.5em 0.75em`,
    "border-radius": `8px`,
    color: `rgba(0,0,0,0.5)`,
    background: `#f7f7f7`,
    margin: `0`,
  },
  hr: {
    "border-style": `solid`,
    "border-width": `1px 0 0`,
    "border-color": `rgba(0,0,0,0.1)`,
    "-webkit-transform-origin": `0 0`,
    "-webkit-transform": `scale(1, 0.5)`,
    "transform-origin": `0 0`,
    transform: `scale(1, 0.5)`,
  },
  link: {
    color: `#576b95`,
    "font-size": `15px`,
    "line-height": `1.75`,
  },
  // 字体加粗样式
  strong: {
    color: `#494E5E`,
    "font-weight": `bold`,
    "font-size": `14px`,
    "line-height": `1.5`,
  },
  em: {
    "font-style": "italic",
    "font-size": `14px`,
    "line-height": `1.5`,
  },
  code: {
    pre: {
      "font-size": `14px`,
      "overflow-x": `auto`,
      "border-radius": `8px`,
      padding: `1em`,
      "line-height": `1.5`,
      margin: `10px 8px`,
    },
    code: {
      margin: `0px`,
      "white-space": `nowrap`,
      "font-family": `Menlo, Operator Mono, Consolas, Monaco, monospace`,
    },
  },
  codeSpan: {
    "font-size": `90%`,
    "white-space": `pre`,
    color: `#d14`,
    background: `rgba(27,31,35,.05)`,
    padding: `3px 5px`,
    "border-radius": `4px`,
  },
};
