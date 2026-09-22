import { describe, it, expect } from 'vitest';
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

const repoRoot = join(__dirname, '../..');
const readme = readFileSync(join(repoRoot, 'README.md'), 'utf8');

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

function fencedBlock(markdown: string) {
  const match = markdown.match(/```[a-z]*\n([\s\S]*?)```/);
  return match ? match[1] : '';
}

function treeEntries(tree: string) {
  const entries: { path: string; line: string }[] = [];
  const stack: { indent: number; segment: string }[] = [];

  for (const line of tree.split('\n')) {
    if (line.trim() === '') {
      continue;
    }

    const indent = line.length - line.trimStart().length;
    const segment = line.trim().split(/\s{2,}/)[0];

    while (stack.length > 0 && stack[stack.length - 1].indent >= indent) {
      stack.pop();
    }

    stack.push({ indent, segment });
    entries.push({ path: stack.map((entry) => entry.segment).join(''), line });
  }

  return entries;
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

  it('maps the repository in an annotated tree', () => {
    const tree = fencedBlock(section('Project structure'));
    const paths = treeEntries(tree).map((entry) => entry.path);

    const expected = [
      'docs/',
      'public/fg/',
      'public/fg/avatar/',
      'public/fg/party.json',
      'public/fonts/',
      'scripts/',
      'src/components/',
      'src/components/dice-roller/',
      'src/components/feats-explorer/',
      'src/components/point-buy/',
      'src/components/xml-viewer/',
      'src/content/docs/',
      'src/generated/',
      'src/pages/fantasy-grounds/characters/[slug].astro',
      'src/styles/',
      'src/utils/',
      'terraform/',
      'worker/',
      'astro.config.mjs',
      'wrangler.jsonc',
      'devbox.json',
      'Makefile',
      'AGENTS.md',
      'CONTEXT.md',
      'SPEC.md',
    ];

    for (const path of expected) {
      expect(paths).toContain(path);
    }
  });

  it('lists tree paths that exist and annotates ignored output', () => {
    const entries = treeEntries(fencedBlock(section('Project structure')));

    expect(entries.length).toBeGreaterThan(0);

    for (const { path, line } of entries) {
      if (/gitignored/i.test(line)) {
        continue;
      }

      expect(existsSync(join(repoRoot, path.replace(/\/$/, '')))).toBe(true);
    }

    const generated = entries.find((entry) => entry.path === 'src/generated/');
    expect(generated?.line).toMatch(/gitignored/i);

    for (const ignored of ['dist/', '.astro/', 'tmp/', '.scratch/']) {
      for (const { line } of entries.filter((entry) => entry.line.includes(ignored))) {
        expect(line).toMatch(/gitignored/i);
      }
    }
  });

  it('states the least client-side JavaScript rule and the islands boundary', () => {
    const architecture = section('Architecture');

    expect(architecture).toMatch(/least client-side JavaScript/i);
    expect(architecture).toMatch(/islands?/i);
    expect(architecture).toContain('Alpine.js');
  });

  it('documents the build-time Fantasy Grounds XML pipeline', () => {
    const architecture = section('Architecture');

    expect(architecture).toContain('astro:config:setup');
    expect(architecture).toContain('src/utils/build-xml-characters.ts');
    expect(architecture).toContain('fast-xml-parser');
    expect(architecture).toContain('src/generated/characters.json');
    expect(architecture).toMatch(/gitignore[d]?/i);
    expect(architecture).toMatch(/(every|each) (dev|build)/i);
    expect(architecture).toContain('Character sheet');
    expect(architecture).toContain('Card');
    expect(architecture).toContain('Character page');
    expect(architecture).toMatch(/prerender/i);
  });

  it('uses CONTEXT.md vocabulary for the character viewer', () => {
    const architecture = section('Architecture');

    expect(architecture).toContain('Character sheet');
    expect(architecture).toContain('Card');
    expect(architecture).toContain('Display mode');
    expect(architecture).toContain('Character page');
    expect(architecture).toMatch(/Display mode[^.]*small, medium, or large/i);
    expect(architecture).toMatch(/chosen at build time/i);
  });

  it('documents rendering conventions linked to their ADRs', () => {
    const rendering = section('Rendering conventions');

    expect(rendering).toContain('IconifyIcon.astro');
    expect(rendering).toMatch(/zero client-side JavaScript/i);
    expect(rendering).toContain('docs/adr/0001-icon-component.md');

    expect(rendering).toContain('astro-mermaid');
    expect(rendering).toContain('docs/adr/0007-mermaid-rendering-strategy.md');

    for (const type of ['note', 'tip', 'caution', 'danger']) {
      expect(rendering).toContain(`:::${type}`);
    }
    expect(rendering).not.toContain(':::info');
    expect(rendering).not.toContain(':::warning');
    expect(rendering).toContain('docs/adr/0004-starlight-admonitions.md');

    expect(rendering).toMatch(/striped|striping/i);
    expect(rendering).toContain('docs/adr/0005-table-row-striping-pattern.md');
  });

  it('resolves every relative Markdown link against the repository', () => {
    const links = [...readme.matchAll(/\[[^\]]*\]\(([^)]+)\)/g)]
      .map((match) => match[1])
      .filter((href) => !/^(https?:|#|mailto:)/.test(href));

    for (const href of links) {
      expect(existsSync(join(repoRoot, href.split('#')[0]))).toBe(true);
    }

    expect(links).toContain('docs/adr/0001-icon-component.md');
    expect(links).toContain('docs/adr/0007-mermaid-rendering-strategy.md');
    expect(links).toContain('docs/adr/0004-starlight-admonitions.md');
    expect(links).toContain('docs/adr/0005-table-row-striping-pattern.md');
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
