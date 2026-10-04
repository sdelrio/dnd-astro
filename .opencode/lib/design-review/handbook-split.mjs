/**
 * Where a source page stops being one sheet.
 *
 * Two pure functions, and both of them run inside the injected sheet assignment
 * as well as here: the assignment embeds their source rather than restating it,
 * the way it embeds the page-number format, so the label a run prints and the
 * label a test asserts are the same code rather than two copies that agree
 * today. That means every function here is a function of its arguments alone -
 * no module scope, no imports - which is a real constraint on this file rather
 * than a style preference.
 *
 * The decision is a function of measurements rather than of what the markup
 * looks like, and it is reported rather than made quietly. A generator that
 * quietly decides where a page ends is a generator that can quietly change which
 * page a rule appears on, and nothing would say so.
 *
 * See ADR-0020, `handbook.mjs` and the Split entry in CONTEXT.md.
 */

/**
 * How much of a break's own text goes into the name of a split.
 *
 * Long enough to identify the block and short enough that a report of thirty
 * splits is thirty lines rather than thirty paragraphs. The remainder is not
 * lost - the block is in the document - it is just not in the label.
 */
export const SPLIT_NAME_TEXT_LIMIT = 48;

/**
 * The label a split is reported under.
 *
 * A heading first, because a heading is where a reader would look to find where
 * the rule begins, and a heading is what an author puts a break before. Failing
 * that, the element's own text, which identifies the block even without a
 * heading. Failing that, the tag, because `hr` is a better label than an empty
 * one and an empty label is a split nobody can go and find.
 */
export function splitName({ tag, heading, text }) {
  const label = String(tag ?? '').toLowerCase();
  const collapse = (value) => String(value ?? '').replace(/\s+/g, ' ').trim();

  const head = collapse(heading);
  if (head !== '') return `${label} at h2 "${head}"`;

  const body = collapse(text);
  if (body === '') return label;

  const cut = body.length > SPLIT_NAME_TEXT_LIMIT ? `${body.slice(0, SPLIT_NAME_TEXT_LIMIT).trimEnd()}…` : body;
  return `${label} at "${cut}"`;
}

/**
 * Which blocks go on which sheet, and every break that decision made.
 *
 * A sheet is `columns` columns of `blockCapacity` each, filled top to bottom and
 * then left to right, which is what `column-fill: auto` does in the stylesheet.
 * Three rules make that arithmetic safe rather than merely plausible:
 *
 *   - **A block that does not fit the column goes to the next column.** That is
 *     what two columns are for, and reporting it as a break would name a split
 *     the author has nothing to do about.
 *   - **An element that spans both columns is a band across the sheet**, so both
 *     columns start again below it. A 200px block does not go beside a
 *     full-width table that has already used 800 of the sheet's 900. The band
 *     starts below the **taller** of the columns filled in this row, not below
 *     the column the band happens to fall in: a table that spans after the first
 *     column is already 800px deep begins 800px down whether the next narrow
 *     block would have gone in column one or column two.
 *   - **A heading travels with the block it introduces.** A block carrying
 *     `keepWithNext` (a heading wrapper, measured by the assignment) and the
 *     block after it are packed as one unit, so a heading cannot be stranded at
 *     the foot of a column - or at the foot of a sheet - while the thing it
 *     introduces starts the next one. The unit is reported as a single split,
 *     named for the heading, when it has to move.
 *   - **A block taller than a column gets a sheet of its own, and is reported if
 *     it is taller than the sheet.** It is never clipped and never split. A
 *     paragraph too long for one column prints down both of them, which is what
 *     the columns are for; one too long for the whole sheet spans pages, and the
 *     report says so, because that is a thing the author has to know and a thing
 *     only they can fix.
 *
 * This is a *plan*, not a measurement. `column-span: all` inside a multicol is
 * intricate enough that a model of it can be wrong in either direction, and the
 * run does not trust this function with the artifact: it applies the plan,
 * measures every sheet again, and splits whatever is still too tall. So an
 * estimate that is wrong costs a pass rather than a wrong page.
 *
 * `blocks` are measured: `{ height, columns, name, kind, keepWithNext }`, where
 * `columns` is how many of the sheet's columns the block spans and `keepWithNext`
 * marks a block that must not be separated from the one that follows it. A
 * horizontal rule the author wrote is an ordinary block here: the generator owns
 * every break, and every one it chooses is reported. See ADR-0024.
 */
export function planSheets({ blocks, blockCapacity, columns }) {
  if (!(blockCapacity > 0)) {
    throw new Error(`A block capacity of ${blockCapacity} is not a height, so no sheet can be planned.`);
  }
  if (!(columns >= 1)) {
    throw new Error(`A sheet of ${columns} columns is not a sheet, so nothing can be packed into it.`);
  }

  // A unit is one block, or a run of blocks welded together by `keepWithNext`:
  // a heading and the block it introduces are one thing to place, because the
  // browser's `break-after: avoid` cannot cross a boundary this function chose.
  // The run is greedy and transitive: a heading that introduces another heading
  // that introduces a table is one unit of three, which is what a document with
  // an `h2` above an `h3` above its first paragraph actually is.
  const units = [];
  for (let index = 0; index < blocks.length; index += 1) {
    const members = [index];
    while (blocks[index]?.keepWithNext && index + 1 < blocks.length) {
      index += 1;
      members.push(index);
    }
    units.push(members);
  }

  const sheets = [];
  const splits = [];
  const oversized = [];

  // The bottom of the last full-width band, how far down each column of the
  // current row has been used, and the column being filled.
  let sheet = [];
  let floor = 0;
  let column = 0;
  let used = Array.from({ length: columns }, () => 0);
  // Set when the sheet that just closed was closed by a unit that needed its own
  // width, so the boundary after it is recorded as well as the one before it.
  let afterTall = false;

  const close = () => {
    if (sheet.length > 0) sheets.push(sheet);
    sheet = [];
    floor = 0;
    column = 0;
    used = Array.from({ length: columns }, () => 0);
  };

  units.forEach((members) => {
    const height = members.reduce((total, index) => total + (Number(blocks[index]?.height) || 0), 0);
    const spans = members.some((index) => (blocks[index]?.columns ?? 1) >= columns);

    // The label travels with the report, so it is resolved here rather than at
    // every call site that reads a split. A unit is named for the block it
    // starts with, which is the heading a reader would look for.
    const first = members[0];
    const label = {
      block: first,
      name: blocks[first]?.name ?? '',
      kind: blocks[first]?.kind ?? '',
    };

    // A unit taller than one column needs the whole width of the sheet, because
    // the only way past a column is into the next one and nothing can go beside
    // it there. Measured, not assumed: a 1501px paragraph in a 938px column is
    // not clipped and is not clipped *at* - it prints down both columns.
    if (height > blockCapacity) {
      // The limit is the sheet, not the column: a unit that spans both columns
      // gets one column's worth of sheet, and one that does not gets both. Past
      // that there is nowhere for it to go at all, and the report says so - as
      // this one entry rather than as a split as well, because the boundary it
      // describes is the boundary the split would have described.
      const tooTall = height > blockCapacity * (spans ? 1 : columns);

      if (tooTall) oversized.push(label);
      else if (sheet.length > 0) splits.push(label);
      if (sheet.length > 0) close();

      sheet.push(...members);
      close();
      afterTall = true;
      return;
    }

    // The break on the far side of a unit that took a sheet to itself is as much
    // a decision as the one on the near side, and an author who puts a rule there
    // removes it in the same way.
    if (sheet.length === 0 && afterTall) {
      splits.push(label);
      afterTall = false;
    }

    // The two places a unit can go on this sheet: where this column has got to,
    // or at the top of the next one. The second is a continuation rather than a
    // break, which is why a unit that takes it is not reported.
    const fits = (at) => floor + at + height <= blockCapacity;

    if (!fits(used[column])) {
      if (column + 1 < columns && fits(0)) {
        column += 1;
        used[column] = 0;
      } else {
        splits.push(label);
        close();
      }
    }

    sheet.push(...members);

    // A band across both columns takes the row it is in, and both columns resume
    // below it rather than the next block continuing beside it. It starts below
    // the taller of the columns filled so far, which is the space it actually
    // occupies when Chrome spans it.
    if (spans) {
      floor += Math.max(...used) + height;
      column = 0;
      used = Array.from({ length: columns }, () => 0);
      return;
    }

    used[column] += height;
  });

  close();

  return { sheets, splits, oversized };
}
