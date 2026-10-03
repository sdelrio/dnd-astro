/**
 * Runtime coverage for the dice roller's Alpine expressions.
 *
 * These are the expressions #328 shipped broken: the render tests read the
 * `.astro` source as text and passed while the rendered card dropped its swap
 * panel. Everything here boots the real component against the real markup and
 * drives it the way a user does.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { ABILITY_LABELS } from "./dice-utils";
import DiceRoller from "./DiceRoller.astro";
import { mountAlpine, type MountedAlpine } from "@/test-utils/alpine-dom";

let harness: MountedAlpine;

/**
 * How long a full six-ability roll takes: each ability waits 300ms before its
 * dice land and 150ms before the next one starts, so 450ms x 6, plus the
 * announce delay.
 *
 * Fake timers, not real ones. A real wait for this is unreliable: the roll is a
 * chain of `setTimeout` callbacks, and under the DOM harness each turn takes
 * far longer than its nominal delay, so a real-timed wait either flakes or runs
 * for ten seconds. Advancing the clock is also a stronger assertion - the
 * component is shown to be finished at 2.8s rather than merely finished by the
 * time the test gave up.
 */
const FULL_ROLL_MS = 2800;
/** 300ms of dice, then 50ms for the announcement to clear and restore. */
const INDIVIDUAL_ROLL_MS = 350;

/** Advances fake timers, flushing the effects each callback schedules. */
async function advance(ms: number): Promise<void> {
  await vi.advanceTimersByTimeAsync(ms);
}

beforeEach(async () => {
  // A fixed face keeps every expectation below a worked example rather than a
  // range: Math.random() of 0.5 is die 4 on a d6.
  vi.spyOn(Math, "random").mockReturnValue(0.5);
  harness = await mountAlpine(DiceRoller);
  vi.useFakeTimers();
});

afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
});

/**
 * happy-dom's own types do not line up with the DOM lib, so the document and
 * the events are borrowed through a cast. Nothing here depends on the
 * difference: these are the same objects the harness booted Alpine against.
 */
function doc(): Document {
  return harness.window.document as unknown as Document;
}

function mouseEvent(): Event {
  return new harness.window.MouseEvent("click", {
    bubbles: true,
  }) as unknown as Event;
}

function escapeEvent(): Event {
  return new harness.window.KeyboardEvent("keydown", {
    key: "Escape",
    bubbles: true,
  }) as unknown as Event;
}

function click(selector: string): void {
  const el = doc().querySelector(selector);
  if (!el) throw new Error(`no element for ${selector}`);
  el.dispatchEvent(mouseEvent());
}

/**
 * The text a user can actually see. Alpine's `x-show` hides an element by
 * setting `display: none` and leaves it in the tree, so `textContent` alone
 * would report the "Roll to generate" placeholder as still on screen next to
 * a filled-in tile.
 */
function shown(el: Element): string {
  const clone = el.cloneNode(true) as HTMLElement;
  for (const hidden of clone.querySelectorAll<HTMLElement>(
    '[style*="display: none"]',
  )) {
    hidden.remove();
  }
  return (clone.textContent ?? "").replace(/\s+/g, " ").trim();
}

function tile(name: string): HTMLElement {
  const found = [
    ...doc().querySelectorAll('button[aria-label^="Select "]'),
  ].find((b) => b.getAttribute("aria-label")?.includes(name));
  const el = found?.closest(".dr-row");
  if (!el) throw new Error(`no tile for ${name}`);
  return el as HTMLElement;
}

/** The ability mark a row draws, read as the sprite symbol it points at. */
function markIn(name: string): string | null {
  const href = tile(name).querySelector("use")?.getAttribute("href");
  if (!href) throw new Error(`${name} draws no mark`);
  return doc().querySelector(href)?.getAttribute("id") ?? null;
}

/** The modifier total as the reader sees it: the figure in the foot. */
function total(): string {
  const el = doc().querySelector(".dr-total");
  if (!el) throw new Error("no modifier total in the foot");
  return (el.textContent ?? "").trim();
}

describe("DiceRoller at runtime", () => {
  it("registers the component, so no expression falls back to a global", () => {
    // Without `Alpine.data('diceRoller', ...)` the root is never initialised
    // and Alpine warns rather than throwing.
    expect(harness.messages).toEqual([]);
  });

  it("renders one row per ability, each inviting a roll", () => {
    const labels = [
      ...doc().querySelectorAll('button[aria-label^="Select "]'),
    ].map((b) => b.getAttribute("aria-label"));
    expect(labels).toEqual([
      `Select ${ABILITY_LABELS.STR} for swap`,
      `Select ${ABILITY_LABELS.DEX} for swap`,
      `Select ${ABILITY_LABELS.CON} for swap`,
      `Select ${ABILITY_LABELS.INT} for swap`,
      `Select ${ABILITY_LABELS.WIS} for swap`,
      `Select ${ABILITY_LABELS.CHA} for swap`,
    ]);
    for (const name of Object.values(ABILITY_LABELS)) {
      expect(shown(tile(name))).toContain("Roll to generate");
    }
  });

  it("fills every tile with dice, a total and a modifier after a full roll", async () => {
    click('[aria-label="Roll all ability scores"]');
    await advance(FULL_ROLL_MS);

    for (const name of Object.values(ABILITY_LABELS)) {
      const text = tile(name).textContent ?? "";
      // 4d6 of fours, drop the lowest: three fours kept, so 12 and +1. The
      // arithmetic is the row's own line and the score has its own plate, so
      // they are asserted as two adjacent figures rather than as one sentence.
      expect(text).toContain("4 + 4 + 4");
      expect(text).toContain("12");
      expect(text).toContain("+1");
      expect(shown(tile(name))).not.toContain("Roll to generate");
    }
    expect(harness.messages).toEqual([]);
  });

  it("disables the controls while a full roll is in flight", async () => {
    click('[aria-label="Roll all ability scores"]');
    await advance(50);
    const rollAll = doc().querySelector(
      '[aria-label="Roll all ability scores"]',
    ) as unknown as HTMLButtonElement;
    expect(rollAll.disabled).toBe(true);
    expect(rollAll.textContent).toContain("Rolling...");
    const reroll = doc().querySelector(
      `[aria-label="Re-roll ${ABILITY_LABELS.STR}"]`,
    ) as unknown as HTMLButtonElement;
    expect(reroll.disabled).toBe(true);

    await advance(FULL_ROLL_MS);
    expect(rollAll.disabled).toBe(false);
    expect(rollAll.textContent).toContain("Roll All Abilities");
  });

  it("re-rolls a single ability without touching the others", async () => {
    click('[aria-label="Roll all ability scores"]');
    await advance(FULL_ROLL_MS);

    vi.mocked(Math.random).mockReturnValue(0.99); // die 6
    click(`[aria-label="Re-roll ${ABILITY_LABELS.STR}"]`);
    await advance(INDIVIDUAL_ROLL_MS);

    expect(shown(tile(ABILITY_LABELS.STR))).toContain("6 + 6 + 6");
    expect(tile(ABILITY_LABELS.STR).textContent).toContain("+4");
    expect(shown(tile(ABILITY_LABELS.DEX))).toContain("4 + 4 + 4");
  });

  it("summarises the session in the stats card and the result log", async () => {
    click('[aria-label="Roll all ability scores"]');
    await advance(FULL_ROLL_MS);

    const body = shown(doc().body);
    // The four figures are stat tiles now: an uppercase micro-label stacked over
    // its value, so the labels carry no trailing colon - a colon after a stacked
    // label is a dangling mark. The harness reports no inter-element whitespace,
    // so each tile reads as its label run straight into its value; asserting
    // that adjacency is also what pins the two into one tile. Six identical
    // totals: lowest and highest are both 12, each seen six times.
    expect(body).toContain("Average12.0");
    expect(body).toContain("Median12");
    expect(body).toContain("Lowest12 (x6)");
    expect(body).toContain("Highest12 (x6)");
    expect(body).toContain(`${ABILITY_LABELS.STR} 12 (+1)`);
    expect(doc().querySelector('[aria-live="polite"]')?.textContent).toBe(
      `All abilities rolled. ${ABILITY_LABELS.STR} 12 (+1), ${ABILITY_LABELS.DEX} 12 (+1), ${ABILITY_LABELS.CON} 12 (+1), ${ABILITY_LABELS.INT} 12 (+1), ${ABILITY_LABELS.WIS} 12 (+1), ${ABILITY_LABELS.CHA} 12 (+1). Modifier total +6.`,
    );
  });

  describe("the mark beside each name", () => {
    it("draws one mark per row before anything is rolled", async () => {
      // The rows are clones of one template, so a mark rendered inline in the
      // template would draw the same mark six times. This is the shape of that
      // failure: six rows, six marks, one of them six times over.
      for (const name of Object.values(ABILITY_LABELS)) {
        expect(markIn(name), `${name} has no mark`).not.toBeNull();
      }
      expect(harness.messages).toEqual([]);
    });

    it("gives the six rows six different marks", async () => {
      const marks = Object.values(ABILITY_LABELS).map(markIn);
      expect(new Set(marks).size, `marks repeat: ${marks.join(', ')}`).toBe(6);
    });

    it("leaves each mark beside its own name after a confirmed swap", async () => {
      // The whole reason the mark is bound to the name: a swap exchanges the
      // dice between two rows, so a mark bound to the row's dice rather than to
      // its name would show the wrong ability beside a correct score. The reader
      // sees the name and the mark as one thing, so this asserts they are.
      const before = Object.values(ABILITY_LABELS).map(markIn);
      click('[aria-label="Roll all ability scores"]');
      await advance(FULL_ROLL_MS);
      vi.mocked(Math.random).mockReturnValue(0.99); // die 6
      click(`[aria-label="Re-roll ${ABILITY_LABELS.STR}"]`);
      await advance(INDIVIDUAL_ROLL_MS);
      click(`button[aria-label="Select ${ABILITY_LABELS.STR} for swap"]`);
      await harness.flush();
      click(`button[aria-label="Select ${ABILITY_LABELS.DEX} for swap"]`);
      await harness.flush();
      click('[aria-label="Confirm swap"]');
      await advance(60);

      // The dice travelled: DEX's row now holds the 18. The marks did not.
      expect(shown(tile(ABILITY_LABELS.DEX))).toContain("6 + 6 + 6");
      expect(Object.values(ABILITY_LABELS).map(markIn)).toEqual(before);
    });

    it("says nothing about the mark, because the row label already names the ability", async () => {
      const handle = tile(ABILITY_LABELS.STR).querySelector(
        'button[aria-label^="Select "]'
      )!;
      expect(handle.getAttribute("aria-label")).toBe(
        `Select ${ABILITY_LABELS.STR} for swap`
      );
      // Nothing in the button's subtree is exposed as an image or as a label.
      for (const svg of handle.querySelectorAll("svg")) {
        expect(svg.getAttribute("aria-hidden"), "the mark is exposed").toBe("true");
      }
    });
  });

  describe("the modifier total", () => {
    it("reads a plain 0 on an unrolled sheet, and says so in the foot", async () => {
      // Zero is a true statement about a sheet nobody has rolled, the way a blank
      // Point Buy sheet states its own starting total. It is written plain
      // because `+0` is not a thing a modifier does.
      expect(total()).toBe("0");
      expect(shown(doc().body)).toContain("Modifier total");
    });

    it("is visible before the Stats block exists", async () => {
      // The Stats block is a window over the session and needs a full roll before
      // it means anything; the total is about the sheet on screen and is true
      // after a single roll. Gating it with the Stats block would hide the one
      // figure that is always answerable.
      expect(shown(doc().body)).toContain("No stats yet!");
      expect(total()).toBe("0");
    });

    it("sums a mixed set of modifiers correctly", async () => {
      // One row rolled on sixes (+4), one on ones (3 kept, so -4), four on fours
      // (+1): +4 -4 +1 +1 +1 +1. A set that is neither all-positive nor
      // all-negative, which is the only shape that catches a sum that assumes
      // either.
      click('[aria-label="Roll all ability scores"]');
      await advance(FULL_ROLL_MS);
      vi.mocked(Math.random).mockReturnValue(0.99); // die 6
      click(`[aria-label="Re-roll ${ABILITY_LABELS.STR}"]`);
      await advance(INDIVIDUAL_ROLL_MS);
      vi.mocked(Math.random).mockReturnValue(0); // die 1
      click(`[aria-label="Re-roll ${ABILITY_LABELS.DEX}"]`);
      await advance(INDIVIDUAL_ROLL_MS);

      expect(shown(tile(ABILITY_LABELS.STR))).toContain("+4");
      expect(shown(tile(ABILITY_LABELS.DEX))).toContain("-4");
      expect(total()).toBe("+4");
    });

    it("follows an individual re-roll, rather than being fixed at the first roll", async () => {
      click('[aria-label="Roll all ability scores"]');
      await advance(FULL_ROLL_MS);
      expect(total()).toBe("+6");

      vi.mocked(Math.random).mockReturnValue(0); // die 1: 3 kept, so -4
      click(`[aria-label="Re-roll ${ABILITY_LABELS.STR}"]`);
      await advance(INDIVIDUAL_ROLL_MS);

      // Five rows at +1 and one at -4.
      expect(total()).toBe("+1");
    });

    it("is unchanged by a swap, because a trade cannot change a sum", async () => {
      click('[aria-label="Roll all ability scores"]');
      await advance(FULL_ROLL_MS);
      vi.mocked(Math.random).mockReturnValue(0.99); // die 6
      click(`[aria-label="Re-roll ${ABILITY_LABELS.STR}"]`);
      await advance(INDIVIDUAL_ROLL_MS);
      const before = total();

      click(`button[aria-label="Select ${ABILITY_LABELS.STR} for swap"]`);
      await harness.flush();
      click(`button[aria-label="Select ${ABILITY_LABELS.CON} for swap"]`);
      await harness.flush();
      click('[aria-label="Confirm swap"]');
      await advance(60);

      // The two rolls changed rows and the figure did not, which is the property
      // that makes the figure usable for comparing two sheets.
      expect(total()).toBe(before);
      expect(before).toBe("+9");
    });

    it("is spoken in the roll-all announcement, in the same sentence", async () => {
      // The announcement already reads all six scores and modifiers, so the total
      // belongs to that sentence rather than in a second announcement: a screen
      // reader user who hears the six figures should not have to be told the sum
      // separately, or told it before they know the six.
      click('[aria-label="Roll all ability scores"]');
      await advance(FULL_ROLL_MS);
      expect(doc().querySelector('[aria-live="polite"]')?.textContent).toMatch(
        /Modifier total \+6\.$/
      );
    });
  });

  describe("the one swap a session allows", () => {
    beforeEach(async () => {
      click('[aria-label="Roll all ability scores"]');
      await advance(FULL_ROLL_MS);
    });

    function swapPanel(): HTMLElement | null {
      return doc().querySelector(".dr-swap");
    }

    it("stages a swap, and renders the confirm pair so the swap can be taken", async () => {
      // #328: the panel was a sibling of the tile, so the ability `x-for` had
      // two roots and Alpine cloned only the first. The panel never appeared.
      click(`button[aria-label="Select ${ABILITY_LABELS.STR} for swap"]`);
      await harness.flush();
      expect(swapPanel()).toBeNull();

      click(`button[aria-label="Select ${ABILITY_LABELS.DEX} for swap"]`);
      await harness.flush();
      expect(swapPanel()?.textContent).toContain(
        `${ABILITY_LABELS.STR} ↔ ${ABILITY_LABELS.DEX}`,
      );
      expect(doc().querySelector('[aria-label="Confirm swap"]')).not.toBeNull();
      expect(doc().querySelector('[aria-label="Cancel swap"]')).not.toBeNull();
    });

    it("exchanges the two totals when confirmed", async () => {
      vi.mocked(Math.random).mockReturnValue(0.5);
      click(`[aria-label="Re-roll ${ABILITY_LABELS.DEX}"]`);
      await advance(INDIVIDUAL_ROLL_MS);
      vi.mocked(Math.random).mockReturnValue(0.99); // die 6
      click(`[aria-label="Re-roll ${ABILITY_LABELS.STR}"]`);
      await advance(INDIVIDUAL_ROLL_MS);

      click(`button[aria-label="Select ${ABILITY_LABELS.STR} for swap"]`);
      await harness.flush();
      click(`button[aria-label="Select ${ABILITY_LABELS.DEX} for swap"]`);
      await harness.flush();
      click('[aria-label="Confirm swap"]');
      await advance(60);

      // The dice travel with the score they rolled, so the STR tile is the one
      // that now shows 12 and the DEX tile shows 18.
      expect(shown(tile(ABILITY_LABELS.STR))).toContain("4 + 4 + 4");
      expect(shown(tile(ABILITY_LABELS.DEX))).toContain("6 + 6 + 6");
      expect(swapPanel()).toBeNull();
      // The newest log line is rewritten rather than a second one invented.
      expect(
        (doc().querySelector(".dr-log-line")?.textContent ?? "").startsWith(
          `${ABILITY_LABELS.STR} 12 (+1), ${ABILITY_LABELS.DEX} 18 (+4)`,
        ),
      ).toBe(true);
    });

    it("leaves both totals alone when cancelled, by button or by Escape", async () => {
      click(`button[aria-label="Select ${ABILITY_LABELS.STR} for swap"]`);
      await harness.flush();
      click(`button[aria-label="Select ${ABILITY_LABELS.DEX} for swap"]`);
      await harness.flush();
      click('[aria-label="Cancel swap"]');
      await harness.flush();
      expect(swapPanel()).toBeNull();
      expect(shown(tile(ABILITY_LABELS.STR))).toContain("12");

      click(`button[aria-label="Select ${ABILITY_LABELS.STR} for swap"]`);
      await harness.flush();
      click(`button[aria-label="Select ${ABILITY_LABELS.CON} for swap"]`);
      await harness.flush();
      doc().dispatchEvent(escapeEvent());
      await harness.flush();
      expect(swapPanel()).toBeNull();
      expect(shown(tile(ABILITY_LABELS.STR))).toContain("12");
      expect(shown(tile(ABILITY_LABELS.CON))).toContain("12");
    });

    it("refuses a second swap and says why", async () => {
      click(`button[aria-label="Select ${ABILITY_LABELS.STR} for swap"]`);
      await harness.flush();
      click(`button[aria-label="Select ${ABILITY_LABELS.DEX} for swap"]`);
      await harness.flush();
      click('[aria-label="Confirm swap"]');
      await advance(60);

      click(`button[aria-label="Select ${ABILITY_LABELS.STR} for swap"]`);
      await advance(60);
      expect(swapPanel()).toBeNull();
      expect(doc().querySelector('[aria-live="polite"]')?.textContent).toBe(
        "This session has already used its swap. Roll all abilities to start a new one.",
      );
    });

    it("deselects a single pick instead of staging a swap with itself", async () => {
      click(`button[aria-label="Select ${ABILITY_LABELS.STR} for swap"]`);
      await advance(60);
      const tileButton = doc().querySelector(
        `button[aria-label="Select ${ABILITY_LABELS.STR} for swap"]`,
      ) as unknown as HTMLButtonElement;
      expect(tileButton.getAttribute("aria-pressed")).toBe("true");
      click(`button[aria-label="Select ${ABILITY_LABELS.STR} for swap"]`);
      await advance(60);
      expect(tileButton.getAttribute("aria-pressed")).toBe("false");
      expect(doc().querySelector('[aria-live="polite"]')?.textContent).toBe(
        `${ABILITY_LABELS.STR} deselected.`,
      );
    });
  });
});
