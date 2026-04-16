/// <reference types="node" />

import {readFileSync} from 'node:fs';

import {describe, expect, it} from 'vitest';

const baseCss = readFileSync(new URL('./base.css', import.meta.url), 'utf8');

describe('base.css mode switch theme styling', () => {
  it.each(['dark', 'aurora', 'cyber_sanctuary'])('defines a themed mode switch container for %s', (theme) => {
    expect(baseCss).toContain(`:root[data-theme='${theme}'] .mode-switch {`);
  });

  it.each(['dark', 'aurora', 'cyber_sanctuary'])('defines a themed active mode switch button for %s', (theme) => {
    expect(baseCss).toContain(`:root[data-theme='${theme}'] .mode-switch__button--active`);
  });
});
