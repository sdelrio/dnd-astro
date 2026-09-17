import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { Window } from 'happy-dom';
import { afterEach, describe, expect, it } from 'vitest';

const require = createRequire(import.meta.url);
const config = readFileSync(new URL('../../astro.config.mjs', import.meta.url), 'utf8');
const windows: Window[] = [];

function component(name: string) {
  const override = config.match(new RegExp(`${name}: ['"]([^'"]+)['"]`))?.[1];
  return readFileSync(
    override
      ? new URL(`../../${override}`, import.meta.url)
      : require.resolve(`@astrojs/starlight/components/${name}.astro`),
    'utf8',
  );
}

function visit(os: 'light' | 'dark', saved: string | null = null) {
  const window = new Window({ url: 'https://example.test/', settings: { device: { prefersColorScheme: os } } });
  windows.push(window);
  if (saved !== null) window.localStorage.setItem('starlight-theme', saved);
  const provider = component('ThemeProvider');
  const script = provider.match(/<script is:inline>([\s\S]*?)<\/script>/)?.[1];
  expect(script).toBeDefined();
  window.eval(script!);
  return window;
}

afterEach(async () => {
  await Promise.all(windows.splice(0).map((window) => window.happyDOM.close()));
});

describe('theme initialization', () => {
  it.each(['light', 'dark'] as const)('uses light before paint with no preference and a %s OS', (os) => {
    const window = visit(os);
    expect(window.document.documentElement.dataset.theme).toBe('light');
    expect(window.localStorage.getItem('starlight-theme')).toBeNull();
  });
});
