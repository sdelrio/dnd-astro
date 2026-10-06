import { describe, it, expect } from 'vitest';
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

const repoRoot = join(__dirname, '../..');
const readme = readFileSync(join(repoRoot, 'README.md'), 'utf8');
const adrIndex = readFileSync(join(repoRoot, 'docs/adr/README.md'), 'utf8');
const configSource = readFileSync(join(repoRoot, 'astro.config.mjs'), 'utf8');
const buildPipelineSource = readFileSync(
  join(repoRoot, 'src/utils/build-xml-characters.ts'),
  'utf8'
);
const packageJson = JSON.parse(readFileSync(join(repoRoot, 'package.json'), 'utf8'));
const workspaceSource = readFileSync(join(repoRoot, 'pnpm-workspace.yaml'), 'utf8');
const makefileSource = readFileSync(join(repoRoot, 'Makefile'), 'utf8');
const characterSheetFiles = readdirSync(
  join(repoRoot, 'src/assets/fantasy-grounds-sheets')
).filter((name) => name.endsWith('.xml'));
const characterPageRouteSource = readFileSync(
  join(repoRoot, 'src/pages/fantasy-grounds/characters/[slug].astro'),
  'utf8'
);

/**
 * The committed sheet directory, read out of the build hook that consumes it.
 *
 * #467: the README's pipeline step said the hook reads sheets "under `src/assets`",
 * the parent, and the guard `expect(readme).not.toContain('src/assets/')` passed
 * because the wrong path it named carried no trailing slash. A guard phrased as a
 * near-miss of a wrong path lets the wrong path through. The subject here is the
 * hook's own literal instead, so the guard and the hook cannot drift apart.
 */
function committedSheetDirectory() {
  const match = buildPipelineSource.match(
    /xmlDir\s*=\s*options\.xmlDir\s*\?\?\s*resolve\(rootDir,\s*'([^']+)'\)/
  );

  if (match === null) {
    throw new Error(
      'build-xml-characters.ts no longer resolves an xmlDir from a string literal, ' +
        'so the README guard has no source of truth to read'
    );
  }

  return match[1];
}

/** The Starlight `sidebar: [...]` block, located by bracket matching. */
function starlightSidebarBlock() {
  const start = configSource.indexOf('sidebar: [');

  if (start === -1) {
    return '';
  }

  let depth = 0;

  for (let index = configSource.indexOf('[', start); index < configSource.length; index++) {
    const char = configSource[index];

    if (char === "'" || char === '"') {
      const close = configSource.indexOf(char, index + 1);

      if (close === -1) {
        break;
      }

      index = close;
    } else if (char === '[') {
      depth++;
    } else if (char === ']') {
      depth--;

      if (depth === 0) {
        return configSource.slice(start, index + 1);
      }
    }
  }

  return '';
}

/** Top-level sidebar group labels. A group label is followed by its `items`. */
function configuredSidebarGroups() {
  return [...starlightSidebarBlock().matchAll(/label: '([^']+)',\s*items: \[/g)].map(
    (match) => match[1]
  );
}

/** The group names in the one sidebar table the README documents. */
function documentedSidebarGroups(markdown: string) {
  const start = markdown.indexOf('sidebar groups are configured');
  const groups: string[] = [];

  if (start === -1) {
    return groups;
  }

  for (const line of markdown.slice(start).split('\n')) {
    if (!/^\s*\|/.test(line)) {
      if (groups.length > 0) {
        break;
      }

      continue;
    }

    const cell = line.match(/^\|\s*([^|]+?)\s*\|/)?.[1];

    if (cell !== undefined && cell !== 'Group' && !/^-+$/.test(cell)) {
      groups.push(cell);
    }
  }

  return groups;
}

/** Decision IDs the index lists, e.g. '0001' ... '0014'. */
function indexedDecisionIds() {
  return [...adrIndex.matchAll(/^\| (\d{4}) \|/gm)].map((match) => match[1]);
}

/** Decision IDs that exist as files, so the index itself cannot go stale. */
function decisionFileIds() {
  return readdirSync(join(repoRoot, 'docs/adr'))
    .map((name) => name.match(/^(\d{4})-/)?.[1])
    .filter((id): id is string => id !== undefined)
    .sort();
}

const adrPaths = {
  icon: 'docs/adr/0001-icon-component.md',
  infraImport: 'docs/adr/0002-infrastructure-import-existing-resources.md',
  workers: 'docs/adr/0003-workers-static-assets-over-pages.md',
  admonitions: 'docs/adr/0004-starlight-admonitions.md',
  tableStriping: 'docs/adr/0005-table-row-striping-pattern.md',
  mermaid: 'docs/adr/0007-mermaid-rendering-strategy.md',
};

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

function headings(markdown: string) {
  const body = markdown.replace(/```[\s\S]*?```/g, '');

  return [...body.matchAll(/^(#{1,6}) (.+)$/gm)].map((match) => ({
    level: match[1].length,
    text: match[2].trim(),
  }));
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

  it('overviews the static-first compendium and its four tools', () => {
    const overview = section('Overview');

    expect(overview).toMatch(/static-first/i);
    expect(overview).toMatch(/SSG/);
    expect(overview).toMatch(/house rules/i);
    expect(overview).toMatch(/four interactive tools/i);
    expect(overview).toContain('Dice Roller');
    expect(overview).toContain('Feat Explorer');
    expect(overview).toContain('Point Buy');
    expect(overview).toContain('XML Character Viewer');
    expect(existsSync(join(repoRoot, 'src/components/point-buy'))).toBe(true);
  });

  it('lists the tech stack in a table', () => {
    const stack = section('Tech stack');

    const rows = [
      'Astro 7 (SSG) + Starlight',
      'Alpine.js components',
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
      '.opencode/',
      '.opencode/lib/',
      '.opencode/lib/design-review/',
      'docs/',
      'public/fg/',
      'public/fg/avatar/',
      'public/fg/party.json',
      'public/fonts/',
      'scripts/',
      'src/assets/',
      `${committedSheetDirectory()}/`,
      'src/alpine.ts',
      'src/components/',
      'src/components/IconifyIcon.astro',
      'src/components/ThemeProvider.astro',
      'src/components/ThemeSelect.astro',
      'src/components/dice-roller/',
      'src/components/feats-explorer/',
      'src/components/point-buy/',
      'src/components/rulebook-index/',
      'src/components/xml-viewer/',
      'src/content.config.ts',
      'src/content/docs/',
      'src/generated/',
      'src/layouts/',
      'src/layouts/PrintDocument.astro',
      'src/pages/fantasy-grounds/characters/[slug].astro',
      'src/pages/handbook/print.astro',
      'src/pages/handbook/spike-fixture.astro',
      'src/styles/',
      'src/test-utils/',
      'src/test-utils/alpine-dom.ts',
      'src/types/',
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

  it('states the least client-side JavaScript rule and the site-wide Alpine runtime', () => {
    const architecture = section('Architecture');

    expect(architecture).toMatch(/least client-side JavaScript/i);
    expect(architecture).toMatch(/no UI framework runtime ships to the browser/i);
    expect(architecture).toMatch(/small Alpine\.js components scoped to the component/i);
    expect(architecture).toContain('Alpine.js');
    expect(architecture).toContain('@astrojs/alpinejs');
    expect(architecture).toContain('src/alpine.ts');
    expect(architecture).toMatch(/injected site-wide/i);
    expect(architecture).not.toMatch(/islands?/i);
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

  it('names the committed sheet directory the build hook actually reads', () => {
    const architecture = section('Architecture');
    const sheetDir = committedSheetDirectory();

    expect(sheetDir).toMatch(/^src\/assets\/.+/);

    const escaped = sheetDir.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

    expect(architecture).toMatch(new RegExp(`${escaped}(?![\\w-])`));
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
    expect(rendering).toMatch(/no Iconify API network call/i);
    expect(rendering).toContain(adrPaths.icon);

    expect(rendering).toContain('astro-mermaid');
    expect(rendering).toContain(adrPaths.mermaid);

    for (const type of ['note', 'tip', 'caution', 'danger']) {
      expect(rendering).toContain(`:::${type}`);
    }
    expect(rendering).not.toContain(':::info');
    expect(rendering).not.toContain(':::warning');
    expect(rendering).toMatch(/`info` and `warning`[^.]*not supported/i);
    expect(rendering).toContain(adrPaths.admonitions);

    expect(rendering).toMatch(/striped|striping/i);
    expect(rendering).toContain(adrPaths.tableStriping);
  });

  it('records a decision range that matches the highest indexed decision', () => {
    const indexed = indexedDecisionIds();
    const onDisk = decisionFileIds();
    const highest = onDisk[onDisk.length - 1];

    expect(indexed.length).toBeGreaterThan(0);
    expect(indexed).toEqual(onDisk);

    const adrLine = treeEntries(fencedBlock(section('Project structure'))).find(
      (entry) => entry.path === 'docs/adr/'
    );
    const range = adrLine?.line.match(/ADR (\d{4})\s*-\s*(\d{4})/);

    expect(range).not.toBeNull();
    expect(range?.[1]).toBe(indexed[0]);
    expect(range?.[2]).toBe(highest);
  });

  it('documents the sidebar groups that actually exist and the hidden guides page', () => {
    const content = section('Content authoring');

    expect(content).toContain('src/content/docs/');
    expect(content).toMatch(/MDX/);
    expect(content).toContain('astro.config.mjs');

    const groups = configuredSidebarGroups();
    expect(groups.length).toBeGreaterThan(0);
    expect(documentedSidebarGroups(content)).toEqual(groups);
    expect(groups).not.toContain('Guides');

    const hiddenPage = 'src/content/docs/guides/xml-card-test.mdx';
    expect(content).toContain(hiddenPage);
    expect(existsSync(join(repoRoot, hiddenPage))).toBe(true);

    const hiddenPageSource = readFileSync(join(repoRoot, hiddenPage), 'utf8');
    expect(hiddenPageSource).toMatch(/^sidebar:\n\s+hidden: true$/m);
    expect(starlightSidebarBlock()).not.toContain('guides/');

    // The page explains its own absence from the navigation, and says so only
    // in its front matter: an agent auditing the archived specifications that
    // name it would otherwise read the missing sidebar entry as a regression
    // and add one, so the note must be there and must stay out of the body.
    const [, frontMatter = '', body = ''] = hiddenPageSource.split(/^---$/m);

    expect(frontMatter).toMatch(/unlinked from the navigation/);
    expect(frontMatter).toMatch(/[Dd]o not add (a sidebar entry|one)/);
    expect(body).not.toMatch(/unlinked from the navigation/);

    expect(content).toMatch(/[Gg]uides group was retired/);

    expect(content).toMatch(
      /Admonitions follow the restriction listed under \[Rendering conventions\]\(#rendering-conventions\)/
    );
    expect(content).not.toContain(adrPaths.admonitions);

    expect(content).toContain('docs/fonts-licensing.md');
  });

  it('states the Starlight admonition restriction exactly once', () => {
    const occurrences = readme.split(adrPaths.admonitions).length - 1;

    expect(occurrences).toBe(1);
    expect(readme).not.toContain(':::info');
    expect(readme).not.toContain(':::warning');
  });

  it('documents the Cloudflare Workers deployment, wrangler config, and Terraform', () => {
    const deployment = section('Deployment and security');

    expect(deployment).toMatch(/Cloudflare Workers/i);
    expect(deployment).toMatch(/static assets/i);
    expect(deployment).toContain(adrPaths.workers);

    expect(deployment).toContain('wrangler.jsonc');
    expect(deployment).toContain('worker/index.js');
    expect(deployment).toContain('env.ASSETS.fetch(request)');
    expect(deployment).toContain('./dist');

    expect(deployment).toContain('terraform/');
    expect(deployment).toContain('cloudflare_workers_script');
    expect(deployment).toContain('cloudflare_workers_domain');
    expect(deployment).toMatch(/custom domain/i);
    expect(deployment).toContain('terraform import');
    expect(deployment).toContain(adrPaths.infraImport);

    expect(deployment).toMatch(/Zero Trust/);
    expect(deployment).toMatch(/Email OTP/i);
    expect(deployment).toContain('onetimepin');

    expect(deployment).toContain('Node 24');
  });

  it('links the committed Terraform tfvars example template', () => {
    const deployment = section('Deployment and security');

    expect(deployment).toContain('[terraform/terraform.tfvars.example](terraform/terraform.tfvars.example)');
    expect(existsSync(join(repoRoot, 'terraform/terraform.tfvars.example'))).toBe(true);
  });

  it('documents the canonical site URL used for sitemap and canonical links', () => {
    const deployment = section('Deployment and security');

    expect(deployment).toContain('https://dnd-companion.lorien.cloud');
    expect(deployment).toMatch(/`site`/);
    expect(deployment).toMatch(/sitemap/i);
    expect(deployment).toContain('terraform/terraform.tfvars');
  });

  it('indexes the documentation set and the agent conventions', () => {
    const docs = section('Documentation and workflow');

    expect(docs).toContain('docs/adr/README.md');
    expect(docs).toContain('docs/specs/README.md');
    expect(docs).toContain('CONTEXT.md');
    expect(docs).toContain('docs/agents/issue-tracker.md');
    expect(docs).toContain('docs/agents/triage-labels.md');
    expect(docs).toContain('docs/agents/domain.md');
    expect(docs).toContain('AGENTS.md');
    expect(docs).toMatch(/canonical/i);
  });

  it('summarizes spec-driven development and the PR merge workflow', () => {
    const docs = section('Documentation and workflow');

    expect(docs).toMatch(/spec-driven development/i);
    expect(docs).toContain('docs/specs/_TEMPLATE.md');
    expect(docs).toMatch(/tags/);
    expect(docs).toContain('adr_constraints');
    expect(docs).toMatch(/archived/);
    expect(docs).toMatch(/pull request/i);
    expect(docs).toMatch(/squash/i);
    expect(docs).toMatch(/never push to master/i);
  });

  it('resolves every relative Markdown link against the repository', () => {
    const links = [...readme.matchAll(/\[[^\]]*\]\(([^)]+)\)/g)]
      .map((match) => match[1])
      .filter((href) => !/^(https?:|#|mailto:)/.test(href));

    for (const href of links) {
      expect(existsSync(join(repoRoot, href.split('#')[0]))).toBe(true);
    }

    for (const adrPath of Object.values(adrPaths)) {
      expect(links).toContain(adrPath);
    }
  });

  it('has no Starlight starter remnants or em dashes', () => {
    expect(readme).not.toContain('Starlight Starter Kit');
    expect(readme).not.toContain('Seasoned astronaut');
    expect(readme).not.toContain('pnpm create astro');
    expect(readme).not.toMatch(/[├└]──/);
    expect(readme).not.toContain('\u2014');
  });

  it('lists only commands that exist in package.json scripts or the Makefile', () => {
    const scripts = Object.keys(
      JSON.parse(readFileSync(join(repoRoot, 'package.json'), 'utf8')).scripts
    );
    const makefile = readFileSync(join(repoRoot, 'Makefile'), 'utf8');
    const commands = section('Commands');

    const rows = [...commands.matchAll(/^\| `([^`]+)` \|/gm)].map((match) => match[1]);
    expect(rows.length).toBeGreaterThan(0);

    for (const command of rows) {
      const pnpm = command.match(/^pnpm (\S+)$/);

      if (pnpm !== null) {
        expect(scripts).toContain(pnpm[1]);
        continue;
      }

      const make = command.match(/^make (\S+)$/);

      if (make === null) {
        expect.fail(`unexpected command in the README table: ${command}`);
      }

      expect(makefile).toMatch(new RegExp(`^${make[1]}:`, 'm'));
    }
  });

  it('has a single H1 and a valid, duplicate-free heading hierarchy', () => {
    const all = headings(readme);

    expect(all[0]).toEqual({ level: 1, text: 'D&D Companion' });
    expect(all.filter((heading) => heading.level === 1)).toHaveLength(1);

    const seen = new Set<string>();
    let previousLevel = 0;

    for (const heading of all) {
      expect(heading.level).toBeLessThanOrEqual(previousLevel + 1);

      const key = heading.text.toLowerCase();
      expect(seen.has(key)).toBe(false);
      seen.add(key);
      previousLevel = heading.level;
    }
  });

  it('reserves rights and points third-party asset licensing at the font docs', () => {
    const licensing = section('Licensing');

    expect(licensing).toMatch(/all rights reserved/i);
    expect(licensing).toContain('docs/fonts-licensing.md');
    expect(licensing).toMatch(/CC-BY-SA 4\.0/);

    expect(existsSync(join(repoRoot, 'LICENSE'))).toBe(false);
    expect(readme).not.toMatch(/\[[^\]]*\]\(\s*LICENSE\s*\)/);
  });

  it('states version badges that match the installed dependencies', () => {
    const major = (specifier: string) => specifier.match(/(\d+)/)?.[1];
    const starlight = packageJson.dependencies['@astrojs/starlight'].match(/(\d+\.\d+)/)?.[1];

    const badges = [
      `Astro-${major(packageJson.dependencies.astro)}`,
      `Starlight-${starlight}`,
      `Alpine.js-${major(packageJson.dependencies.alpinejs)}`,
      `Tailwind-v${major(packageJson.devDependencies.tailwindcss)}`,
      `TypeScript-${major(packageJson.devDependencies.typescript)}`,
      `Vitest-${major(packageJson.devDependencies.vitest)}`,
      `Node-${major(packageJson.engines?.node ?? '')}`,
      `pnpm-${major(packageJson.packageManager ?? '')}`,
    ];

    for (const badge of badges) {
      expect(badge, 'a version source resolved to undefined').not.toMatch(/undefined/);
      expect(readme).toContain(`badge/${badge}-`);
    }
  });

  it('enforces the runtime and package-manager versions at install time', () => {
    expect(packageJson.engines?.node).toMatch(/^>=24 </);
    expect(packageJson.packageManager).toMatch(/^pnpm@11\./);
    expect(workspaceSource).toMatch(/^engineStrict:\s*true$/m);

    const quickStart = section('Quick start');
    expect(quickStart).toContain('Node 24');
    expect(quickStart).toContain('pnpm 11');
    expect(quickStart).toMatch(/engineStrict|enforced at install/i);
  });

  it('counts the committed sheets and scopes the sidebar claim to the content pages', () => {
    const content = section('Content authoring');

    expect(characterSheetFiles).toHaveLength(111);
    expect(readme).toContain(`${characterSheetFiles.length} files`);
    expect(content).toContain(`all ${characterSheetFiles.length} character pages`);
    expect(content).not.toMatch(/sidebar is global, so it is reachable from every page/i);
    expect(characterPageRouteSource).toMatch(/hasSidebar=\{false\}/);
  });

  it('describes the styles directory with its print stylesheet and shared helper', () => {
    const line =
      fencedBlock(section('Project structure'))
        .split('\n')
        .find((entry) => /^\s*styles\//.test(entry)) ?? '';

    expect(line).toMatch(/print stylesheet/i);
    expect(line).toMatch(/contrast/i);
    expect(existsSync(join(repoRoot, 'src/styles/handbook-print.css'))).toBe(true);
    expect(existsSync(join(repoRoot, 'src/styles/contrast.ts'))).toBe(true);
  });

  it('names every xml-viewer component in the tree', () => {
    const components = readdirSync(join(repoRoot, 'src/components/xml-viewer'))
      .filter((name) => name.endsWith('.astro'))
      .map((name) => name.replace(/\.astro$/, ''));
    const line =
      fencedBlock(section('Project structure'))
        .split('\n')
        .find((entry) => /xml-viewer\//.test(entry)) ?? '';

    expect(components).toHaveLength(10);

    for (const component of components) {
      expect(line).toContain(component);
    }
  });

  it('documents the audits directory and the font licensing note', () => {
    const paths = treeEntries(fencedBlock(section('Project structure'))).map(
      (entry) => entry.path
    );

    expect(paths).toContain('docs/audits/');
    expect(paths).toContain('docs/fonts-licensing.md');

    const docs = section('Documentation and workflow');

    expect(docs).toContain('docs/audits/');
    expect(docs).toContain('docs/fonts-licensing.md');
  });

  it('documents every make target in the commands table', () => {
    const targets = [...makefileSource.matchAll(/^([a-z][a-z0-9-]*):/gm)].map(
      (match) => match[1]
    );
    const commands = section('Commands');

    expect(targets.length).toBeGreaterThan(10);

    for (const target of targets) {
      expect(commands).toContain(`| \`make ${target}\` |`);
    }
  });

  it('presents the dashboard-only wrangler pin as history, not an instruction', () => {
    const deployment = section('Deployment and security');

    expect(deployment).toMatch(/dashboard-only/i);
    expect(deployment).toMatch(/nothing in this repository pins/i);
    expect(deployment).toMatch(/historical/i);
    expect(deployment).not.toMatch(
      /pin wrangler to an exact version so the same CLI runs on every build/i
    );
  });
});
