import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { Window } from 'happy-dom';
import ts from 'typescript';
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

function initializeSelector(window: Window) {
  window.document.body.innerHTML = `<starlight-theme-select><select>
    <option value="dark">Dark</option><option value="light">Light</option>
    <option value="auto" selected>System</option>
  </select><svg class="label-icon"></svg></starlight-theme-select>`;
  const source = component('ThemeSelect');
  for (const match of source.matchAll(/<script(?: is:inline)?>([\s\S]*?)<\/script>/g)) {
    window.eval(ts.transpile(match[1], { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.None }));
  }
  window.dispatchEvent(new window.Event('resize'));
  return window.document.querySelector('select')!;
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

  it.each([
    ['dark', 'dark'],
    ['dark', 'light'],
    ['light', 'dark'],
    ['light', 'light'],
  ] as const)('keeps a saved %s choice on a %s OS', (saved, os) => {
    const window = visit(os, saved);
    expect(window.document.documentElement.dataset.theme).toBe(saved);
    const select = initializeSelector(window);
    expect(select.value).toBe(saved);
    expect(window.document.documentElement.dataset.theme).toBe(saved);
    expect(window.localStorage.getItem('starlight-theme')).toBe(saved);
  });

  it.each(['light', 'dark'] as const)('saved System follows the %s OS', (os) => {
    const window = visit(os, '');
    expect(window.document.documentElement.dataset.theme).toBe(os);
  });

  it.each(['light', 'dark'] as const)('keeps the light fallback through client initialization on a %s OS', (os) => {
    const window = visit(os);
    const select = initializeSelector(window);
    expect(window.document.documentElement.dataset.theme).toBe('light');
    expect(select.value).toBe('light');
    expect(window.localStorage.getItem('starlight-theme')).toBeNull();
  });

  it.each(['light', 'dark'] as const)('persists explicit choices across reload and navigation on a %s OS', (os) => {
    const window = visit(os);
    const select = initializeSelector(window);
    for (const choice of ['dark', 'light', 'auto', 'dark']) {
      select.value = choice;
      select.dispatchEvent(new window.Event('change'));
      const expected = choice === 'auto' ? os : choice;
      const saved = choice === 'auto' ? '' : choice;
      expect(window.document.documentElement.dataset.theme).toBe(expected);
      expect(window.localStorage.getItem('starlight-theme')).toBe(saved);
      for (const path of ['/', '/guides/']) {
        const returning = visit(os, window.localStorage.getItem('starlight-theme'));
        returning.happyDOM.setURL(`https://example.test${path}`);
        expect(returning.document.documentElement.dataset.theme).toBe(expected);
        const returningSelect = initializeSelector(returning);
        expect(returningSelect.value).toBe(choice);
        expect(returning.document.documentElement.dataset.theme).toBe(expected);
        expect(returning.localStorage.getItem('starlight-theme')).toBe(saved);
      }
    }
  });

  it.each([null, 'light', 'dark'])('ignores OS changes for preference %s', (saved) => {
    const window = visit('light', saved);
    const select = initializeSelector(window);
    window.happyDOM.settings.device.prefersColorScheme = 'dark';
    window.dispatchEvent(new window.Event('resize'));
    expect(window.document.documentElement.dataset.theme).toBe(saved ?? 'light');
    expect(select.value).toBe(saved ?? 'light');
    expect(window.localStorage.getItem('starlight-theme')).toBe(saved);
  });

  it('saved System switches when the OS changes', () => {
    const window = visit('light', '');
    const select = initializeSelector(window);
    expect(window.document.documentElement.dataset.theme).toBe('light');
    window.happyDOM.settings.device.prefersColorScheme = 'dark';
    window.dispatchEvent(new window.Event('resize'));
    expect(window.document.documentElement.dataset.theme).toBe('dark');
    expect(select.value).toBe('auto');
    expect(window.localStorage.getItem('starlight-theme')).toBe('');
    const returning = visit('dark', window.localStorage.getItem('starlight-theme'));
    expect(returning.document.documentElement.dataset.theme).toBe('dark');
    expect(initializeSelector(returning).value).toBe('auto');
    window.happyDOM.settings.device.prefersColorScheme = 'light';
    window.dispatchEvent(new window.Event('resize'));
    expect(window.document.documentElement.dataset.theme).toBe('light');
    expect(select.value).toBe('auto');
    expect(window.localStorage.getItem('starlight-theme')).toBe('');
  });
});
