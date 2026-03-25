import {defineConfig} from 'astro/config';

export default defineConfig({
  output: 'static',
  scopedStyleStrategy: 'where',
  markdown: {
    syntaxHighlight: {
      type: 'shiki',
      excludeLangs: ['log'],
    },
  },
});
