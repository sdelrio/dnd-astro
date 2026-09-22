import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const readme = readFileSync(join(__dirname, '../../README.md'), 'utf8');

function section(heading: string) {
  const marker = `## ${heading}\n`;
  const start = readme.indexOf(marker);

  if (start === -1) {
    return '';
  }

  const rest = readme.slice(start + marker.length);
  const end = rest.search(/\n## /);

  return end === -1 ? rest : rest.slice(0, end);
}

describe('README', () => {
  it('names the project and states the pitch', () => {
    expect(readme).toMatch(/^# D&D Companion$/m);
    expect(readme).toContain('D&D rules, Fantasy Grounds xml visualizer.');
    expect(readme).toMatch(/Starlight docs site/);
    expect(readme).toMatch(/Fantasy Grounds character viewer/);
    expect(readme).toMatch(/homebrew D&D 5e campaign/);
  });

  it('shows static shields.io badges for the stack and no build status badge', () => {
    const badges = [
      'Astro-',
      'Starlight-',
      'Alpine\\.js-',
      'Tailwind-',
      'TypeScript-',
      'Vitest-',
      'Node-',
      'pnpm-',
      'Cloudflare_Workers-',
    ];

    for (const badge of badges) {
      expect(readme).toMatch(
        new RegExp(`!\\[[^\\]]+\\]\\(https://img\\.shields\\.io/badge/${badge}[^)]*\\)`)
      );
    }

    expect(readme).not.toMatch(/actions\/workflows|github\/workflows/);
  });

  it('overviews the static-first compendium and its three tools', () => {
    const overview = section('Overview');

    expect(overview).toMatch(/static-first/i);
    expect(overview).toMatch(/SSG/);
    expect(overview).toMatch(/house rules/i);
    expect(overview).toContain('Dice Roller');
    expect(overview).toContain('Feat Explorer');
    expect(overview).toContain('XML Character Viewer');
  });

  it('lists the tech stack in a table', () => {
    const stack = section('Tech stack');

    const rows = [
      'Astro 7 (SSG) + Starlight',
      'Alpine.js islands',
      'Tailwind v4',
      'fast-xml-parser build pipeline',
      'Mermaid',
      'Vitest',
      'Cloudflare Workers static assets',
      'Terraform',
      'devbox / Node 24',
    ];

    for (const row of rows) {
      expect(stack).toContain(`| ${row} |`);
    }
  });

  it('documents the quick start and the background dev server convention', () => {
    const quickStart = section('Quick start');

    expect(quickStart).toContain('Node 24');
    expect(quickStart).toContain('pnpm 11');
    expect(quickStart).toContain('devbox');
    expect(quickStart).toContain('pnpm install');
    expect(quickStart).toContain('pnpm dev');
    expect(quickStart).toContain('astro dev --background');
    expect(quickStart).toContain('astro dev stop');
    expect(quickStart).toContain('astro dev status');
    expect(quickStart).toContain('astro dev logs');
  });

  it('documents the project commands in a table', () => {
    const commands = section('Commands');

    const rows = [
      '`pnpm dev`',
      '`pnpm build`',
      '`pnpm preview`',
      '`pnpm typecheck`',
      '`pnpm lint`',
      '`pnpm test`',
      '`pnpm astro`',
      '`make check`',
    ];

    for (const row of rows) {
      expect(commands).toContain(`| ${row} |`);
    }

    expect(commands).toContain('`CI=true pnpm typecheck`');
  });

  it('has no Starlight starter remnants or em dashes', () => {
    expect(readme).not.toContain('Starlight Starter Kit');
    expect(readme).not.toContain('Seasoned astronaut');
    expect(readme).not.toContain('pnpm create astro');
    expect(readme).not.toMatch(/[├└]──/);
    expect(readme).not.toContain('src/assets/');
    expect(readme).not.toContain('\u2014');
  });
});
