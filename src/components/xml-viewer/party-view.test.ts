import { describe, it, expect, beforeAll, beforeEach, afterEach, vi } from 'vitest';
import { mkdtempSync, rmSync, writeFileSync, readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { tmpdir } from 'node:os';
import { experimental_AstroContainer as AstroContainer } from 'astro/container';
import PartyView from './PartyView.astro';
import { getCharacters } from '@/utils/generated-characters';

let container: AstroContainer;

beforeAll(async () => {
  container = await AstroContainer.create();
});

async function render(rosterPath?: string): Promise<string> {
  return container.renderToString(PartyView, { props: { rosterPath } });
}

function memberCards(html: string): string[] {
  return html.split('role="listitem"').slice(1);
}

describe('PartyView', () => {
  let tempDir: string;
  let warnSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    tempDir = mkdtempSync(join(tmpdir(), 'party-view-test-'));
    warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
  });

  afterEach(() => {
    warnSpy.mockRestore();
    rmSync(tempDir, { recursive: true, force: true });
  });

  it('renders the full roster from the default party.json', async () => {
    const rosterPath = resolve(process.cwd(), 'public/fg/party.json');
    const rosterSize = (JSON.parse(readFileSync(rosterPath, 'utf8')) as { members: unknown[] })
      .members.length;
    const html = await render();
    expect(memberCards(html)).toHaveLength(rosterSize);
    expect(html).toContain('Stats &amp; Filters');
    expect(html).toContain(`${rosterSize} active members`);
    expect(html).toContain('Drakknor');
  });

  it('renders every member as a medium card closed by its own role band', async () => {
    const html = await render();
    const cells = memberCards(html);
    expect(cells.length).toBeGreaterThan(0);
    for (const cell of cells) {
      expect(cell).toContain('class="party-cell');
      // The band is inside the cell, after the card, so it reads as the card's
      // own footer rather than a sibling caption.
      expect(cell).toContain('party-cell-meta');
      expect(cell.indexOf('party-cell-meta')).toBeGreaterThan(cell.indexOf('char-name'));
      // Medium carries Skills, Languages and Feats and drops Saving Throws
      // (ADR-0017); small shows none of the four.
      expect(cell).toContain('>Languages</h3>');
      expect(cell).not.toContain('Saving Throws');
      expect(cell.indexOf('>Languages</h3>')).toBeGreaterThan(cell.indexOf('data-panel="skills"'));
    }
  });

  // ADR-0009 decision 3 records the identical trap on the filter panels: a bare
  // `hidden` sitting beside a component `display` rule is silently dead, because
  // the two tie on specificity and the component style is emitted later. The
  // guard it prescribed was a class-list assertion - "contains no `hidden`" -
  // not a computed style, and that is the shape used here.
  //
  // The failure was invisible in every other signal: the chips, their
  // `aria-pressed` and the live-region count all kept updating, so the only
  // symptom was cards that never left the page.
  //
  // Asserted on the rendered binding because happy-dom does not resolve the
  // cascade, and `party-view-alpine.test.ts` cannot observe a `:class` write at
  // all (see that harness's documented gap). The rendered outcome is checked
  // with `make measure ARGS='tap --url .../current-party/ --selector <chip>
  // --target <cell>'`, which reports the tapped cell's computed display.
  it('hides a filtered-out card with the important modifier, not the bare utility', async () => {
    const html = await render();
    // Matched off the whole page, not off `memberCards`: `role="listitem"` is
    // written after `:class`, so splitting on it puts every binding in the tail
    // of the *preceding* segment. The count is asserted too, because a roster
    // that rendered nothing would make the loop below vacuous.
    const bindings = [...html.matchAll(/:class="\{ [^"]*hasActiveRole[^"]*\}"/g)].map((m) => m[0]);
    expect(bindings.length).toBe(memberCards(html).length);
    expect(bindings.length).toBeGreaterThan(0);
    for (const binding of bindings) {
      expect(binding).toContain("'hidden!'");
      expect(binding).not.toMatch(/:class="\{ hidden:/);
    }
  });

  it('drops the sm step so a medium card never lands in a ~300px cell', async () => {
    const html = await render();
    const roster = html.match(/<section class="([^"]*grid[^"]*)" role="list"/);
    expect(roster).not.toBeNull();
    const classes = roster?.[1] ?? '';
    expect(classes).toContain('lg:grid-cols-2');
    expect(classes).not.toContain('sm:grid-cols');
    expect(classes).not.toContain('grid-cols-3');
  });

  it('renders an empty state instead of crashing when the roster file is missing', async () => {
    const html = await render(join(tempDir, 'missing-party.json'));
    expect(memberCards(html)).toHaveLength(0);
    expect(html).toContain('0 active members');
    expect(html).toContain('Party roster unavailable');
    expect(warnSpy).toHaveBeenCalledTimes(1);
    expect(warnSpy.mock.calls[0][0]).toMatch(/unable to read party roster/);
  });

  it('renders an empty state instead of crashing when the roster file is corrupt', async () => {
    const corrupt = join(tempDir, 'party.json');
    writeFileSync(corrupt, '{ this is not json');
    const html = await render(corrupt);
    expect(memberCards(html)).toHaveLength(0);
    expect(html).toContain('Party roster unavailable');
    expect(warnSpy).toHaveBeenCalledTimes(1);
    expect(warnSpy.mock.calls[0][0]).toMatch(/not valid JSON/);
  });

  it('renders only the valid subset when members are missing or roles unknown', async () => {
    const roster = join(tempDir, 'party.json');
    writeFileSync(
      roster,
      JSON.stringify({
        partyName: 'Subset',
        members: [
          { filename: 'draknor', roles: ['tank', 'bard'] },
          { filename: 'ghost', roles: ['healer'] },
          { filename: 'elarion', roles: ['damage'] },
        ],
      })
    );
    const html = await render(roster);
    expect(memberCards(html)).toHaveLength(2);
    expect(html).toContain('Subset');
    expect(html).toContain('2 active members');
    expect(html).toContain('Drakknor');
    expect(html).toContain('Elarion Myrthas');
    expect(html).not.toContain('ghost');
    const warnMessages = warnSpy.mock.calls.map((call: unknown[]) => String(call[0]));
    expect(warnMessages.some((m: string) => /unknown role "bard"/.test(m))).toBe(true);
    expect(warnMessages.some((m: string) => /character data missing for "ghost"/.test(m))).toBe(true);
  });

  it('renders a usable page for a roster where no member resolves', async () => {
    const roster = join(tempDir, 'party.json');
    writeFileSync(
      roster,
      JSON.stringify({
        partyName: 'Empty',
        members: [{ filename: 'ghost', roles: ['tank'] }],
      })
    );
    const html = await render(roster);
    expect(memberCards(html)).toHaveLength(0);
    expect(html).toContain('0 active members');
    expect(html).not.toContain('Party roster unavailable');
    expect(html).toContain('No members could be resolved');
    expect(getCharacters().length).toBeGreaterThan(0);
  });
});
