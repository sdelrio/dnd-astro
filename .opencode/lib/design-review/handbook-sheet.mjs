/**
 * The sheet assignment the Handbook command injects at document start.
 *
 * ADR-0020 requires the print routes to ship no JavaScript: the committed route
 * is inert HTML, and the artifact is not a page a reader could run code on. So
 * this string is the whole of the route's behaviour, it is injected through the
 * same document-start mechanism the capture command uses to seed the theme
 * before the first paint, and it exists nowhere in the repository's HTML.
 *
 * The geometry is read from the print stylesheet rather than restated here. A
 * second copy of the sheet size is two numbers that can disagree, and the
 * failure would be a document that paginates at a size nobody chose. The same
 * goes for the column width and the ornament: this string names properties, and
 * every value behind them lives in `src/styles/handbook-print.css`.
 *
 * Four decisions the assignment makes, all from measurements rather than from
 * what the markup looks like:
 *
 *   - **What spans both columns.** A table wider than its column is the expected
 *     case in this book, not the exception, and there are two shapes of it: the
 *     table itself, and a scroll container whose own box fits while the table
 *     inside it does not. Reading both `width` and `scrollWidth` is what catches
 *     the second one; guessing from a tag name catches neither reliably.
 *   - **Where a source page that does not fit is broken.** At the nearest block
 *     boundary, never inside a block and never clipped: content is moved into
 *     sheets of its own rather than cut. Every break is recorded and reported by
 *     name, because a generator that quietly decides where a page ends is a
 *     generator that can quietly change which page a rule appears on.
 *   - **That the plan is only a plan.** The split is applied, every sheet is
 *     measured again, and whatever is still too tall is split again, until a pass
 *     finds nothing left to break. A model of `column-span: all` can be wrong in
 *     either direction; this loop is what makes the artifact right rather than
 *     the model.
 *   - **What each footer's page number says.** The total is the sheet count,
 *     which is known as soon as every source page has been split, and the format
 *     is the command's rather than a second copy of it here.
 *
 * Everything pure that the command's own tests assert from - the page-number
 * format, the width check, the sheet plan, the name of a split, the text hash -
 * is embedded here as its own source, so a label a run prints and a label a test
 * checks are one implementation rather than two that agree today.
 */

import { COLUMN_TOLERANCE_PX, elementsWiderThanColumn, pageNumberLabel } from './handbook-helpers.mjs';
import { SPLIT_NAME_TEXT_LIMIT, planSheets, splitName } from './handbook-split.mjs';

/**
 * The name `elementsWiderThanColumn`'s own default argument refers to.
 *
 * Named rather than repeated so the injected copy of that function finds the
 * same tolerance the module has, rather than failing on an identifier that does
 * not exist in the browser.
 */
const COLUMN_TOLERANCE_PX_NAME = 'COLUMN_TOLERANCE_PX';

/**
 * The name `splitName` reads its own text limit from.
 *
 * The same problem and the same answer as the column tolerance: the embedded copy
 * of that function has to find the same number the module has, or the label a run
 * prints is a different length from the label a test asserts.
 */
const SPLIT_NAME_TEXT_LIMIT_NAME = 'SPLIT_NAME_TEXT_LIMIT';

/** The attribute that marks a source page as a sheet, carrying its number. */
export const SHEET_ATTRIBUTE = 'data-handbook-sheet';

/** Where the assignment publishes what it measured, for the command to read. */
export const LAYOUT_GLOBAL = '__handbookLayout';

/** The attributes a split is recorded on, so the report can name it later. */
const SPLIT_BEFORE_ATTRIBUTE = 'data-handbook-split-before';
const SPLIT_KIND_ATTRIBUTE = 'data-handbook-split-kind';
const OVERSIZED_ATTRIBUTE = 'data-handbook-oversized';
const OVERSIZED_HEIGHT_ATTRIBUTE = 'data-handbook-oversized-height';

/**
 * How many times the assignment will split before it gives up.
 *
 * A pass that splits nothing ends the loop, and every pass that does split adds a
 * sheet, so the loop is bounded by the length of the book. This is the belt to
 * that braces: a number no book reaches, and a number that exists so a future
 * change which breaks the invariant stops rather than spins.
 */
export const MAX_SPLIT_PASSES = 200;

export function sheetAssignmentScript() {
  // The decisions the assignment delegates - the page-number format, what is too
  // wide for its column, where a sheet breaks and what a split is called - are
  // embedded as their own source rather than retyped into this string. That is what
  // keeps the "12 of 48" a reader sees in the artifact, the tolerance that decides
  // whether a table spans and the break the planner chose the same implementations
  // the command's tests assert from, instead of two copies that agree today.
  const embed = (fn) => `const ${fn.name} = ${fn.toString()};`;

  return `(() => {
  ${embed(pageNumberLabel)}
  ${embed(elementsWiderThanColumn)}
  ${embed(planSheets)}
  ${embed(splitName)}
  const ${COLUMN_TOLERANCE_PX_NAME} = ${COLUMN_TOLERANCE_PX};
  const ${SPLIT_NAME_TEXT_LIMIT_NAME} = ${SPLIT_NAME_TEXT_LIMIT};

  const assignSheets = async () => {
    const readLength = (name) => {
      const value = parseFloat(getComputedStyle(document.documentElement).getPropertyValue(name));
      return Number.isFinite(value) && value > 0 ? value : null;
    };

    // The ornament is declared as a CSS url() so that the path a reader of the
    // artifact would look for is written down in one place. Read rather than
    // restated, and refused rather than defaulted: a footer with a broken image
    // is a page with a hole in the middle of it.
    const readUrl = (name) => {
      const value = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
      const match = /^url\\(\\s*['"]?([^'")]+)['"]?\\s*\\)$/.exec(value);
      return match ? match[1] : null;
    };

    const sheet = {
      width: readLength('--handbook-sheet-width'),
      height: readLength('--handbook-sheet-height'),
    };

    if (sheet.width === null || sheet.height === null) {
      throw new Error(
        'The print stylesheet did not declare --handbook-sheet-width and --handbook-sheet-height, ' +
        'so a page boundary cannot be placed and the document would print as one long page.'
      );
    }

    // The page box is what a capture is taken at rather than what content is
    // measured against, so it is reported rather than enforced here - but a run
    // that has to discover it is missing from a written capture has spent a whole
    // browser session to learn a number the stylesheet either declares or does not.
    // The margins travel with it because the capture has to know where the page
    // box puts the sheet inside the page.
    const page = {
      width: readLength('--handbook-page-width'),
      height: readLength('--handbook-page-height'),
      marginTop: readLength('--handbook-page-margin-top'),
      marginRight: readLength('--handbook-page-margin-right'),
      marginBottom: readLength('--handbook-page-margin-bottom'),
      marginLeft: readLength('--handbook-page-margin-left'),
    };

    if (page.width === null || page.height === null || page.marginLeft === null) {
      throw new Error(
        'The print stylesheet did not declare --handbook-page-width, --handbook-page-height and ' +
        '--handbook-page-margin-left, so a capture of a sheet would be taken at the wrong size and ' +
        'with no page around it.'
      );
    }

    const columnWidth = readLength('--handbook-column-width');
    const ornament = readUrl('--handbook-ornament');

    if (ornament === null) {
      throw new Error(
        'The print stylesheet did not declare --handbook-ornament as a url(), so every sheet footer ' +
        'would print a broken image where its decorative rule belongs.'
      );
    }

    // Measured after the faces settle, because a heading set in the fallback face
    // wraps into fewer lines than the same heading in Cinzel: measured early,
    // Character Creation came out 678px short of its printed height, which is a
    // page of difference in a document whose page count this run then checks.
    if (document.fonts && document.fonts.ready) {
      await document.fonts.ready;
    }

    const settle = () =>
      new Promise((done) => requestAnimationFrame(() => requestAnimationFrame(() => setTimeout(done, 0))));

    // One tick for the browser to lay the document out again after the previous
    // pass moved things in it. Reading a measurement in the same task as the
    // mutation that caused it reads the layout from before the mutation.
    const relayout = () => new Promise((done) => setTimeout(done, 0));

    /** How many columns the sheet's flow has, which is the stylesheet's opt-out. */
    const columnsOf = (section) => (section.getAttribute('data-handbook-columns') === '1' ? 1 : 2);

    /**
     * The space a block takes, margins included.
     *
     * Margins included because that is the space it takes up: a paragraph with a
     * 24px margin below it stops the next one 24px lower, and adding heights
     * alone would fill a sheet the plan says is half empty. Read from the computed
     * style rather than guessed, because the house-rule pages set their own.
     */
    const occupied = (element) => {
      const style = getComputedStyle(element);
      const margins = (parseFloat(style.marginTop) || 0) + (parseFloat(style.marginBottom) || 0);

      return Math.ceil(element.getBoundingClientRect().height + margins);
    };

    /** What a block is called in the split report. */
    const labelOf = (element) =>
      splitName({
        tag: element.tagName.toLowerCase(),
        heading: element.querySelector('h2, h3, h4')?.textContent ?? '',
        text: element.textContent ?? '',
      });

    /** An empty copy of an element: the same attributes and classes, no children. */
    const shellOf = (element) => {
      const shell = element.cloneNode(false);
      // An id belongs to the element it was written on, and a copy of it in the
      // artifact is a second element answering to the same id, which is a document
      // with two answers to "which one is this".
      shell.removeAttribute('id');
      // Whether it spans both columns is measured again from what this copy
      // measures, so yesterday's mark is not this piece's evidence.
      shell.removeAttribute('data-handbook-wide');
      return shell;
    };

    /**
     * How many of the sheet's columns a block spans.
     *
     * Read from the mark the width pass left rather than from a tag name, because
     * a table is not wide because it is a table: it is wide because it measured
     * wider than its column, and this book has tables of both kinds.
     */
    const widthIn = (element) =>
      element.hasAttribute('data-handbook-wide') ||
      (columnWidth !== null && element.getBoundingClientRect().width > columnWidth + ${COLUMN_TOLERANCE_PX})
        ? 2
        : 1;

    /**
     * A table, broken at a row.
     *
     * A reference table is one block with no block boundary above its rows, so a
     * row is the only place inside one that can be broken at all - and a
     * continuation repeats the header, because a page of numbers with no column
     * headings on it is a page nobody can read.
     */
    const fragmentTable = (table, budget, wrap) => {
      const header = table.querySelector('thead');
      const headerHeight = header === null ? 0 : occupied(header);
      // The body rows only: the header row is repeated by being copied rather than
      // by being one more row in the list, and a header row that also travelled
      // into the body would print twice over the first row of the continuation.
      const rows = [...table.querySelectorAll('tr')].filter(
        (row) => row.closest('table') === table && row.closest('thead') === null
      );
      const label = labelOf(table);
      const columns = widthIn(table);

      const groups = [];
      let group = [];
      let used = 0;

      for (const row of rows) {
        const height = occupied(row);

        if (group.length > 0 && used + height > budget) {
          groups.push(group);
          group = [];
          used = 0;
        }
        // Every group pays for the header row it repeats.
        if (group.length === 0) used += headerHeight;

        group.push(row);
        used += height;
      }
      if (group.length > 0) groups.push(group);

      if (groups.length <= 1) {
        return [{ wrap, nodes: [table], height: occupied(table), columns, tag: 'table', label }];
      }

      return groups.map((rowsInGroup) => {
        const piece = shellOf(table);
        if (header !== null) piece.appendChild(header.cloneNode(true));

        const body = document.createElement('tbody');
        for (const row of rowsInGroup) body.appendChild(row);
        piece.appendChild(body);

        return {
          wrap,
          nodes: [piece],
          height: headerHeight + rowsInGroup.reduce((total, row) => total + occupied(row), 0),
          columns,
          tag: 'table',
          label,
        };
      });
    };

    /**
     * Break one block into the pieces that each fit a sheet.
     *
     * The wrap is the chain of empty copies of the ancestors this piece was broken
     * out of, outermost first, and each piece carries its own copies of them. Two
     * pieces of one wrapper are therefore two wrappers on two sheets rather than
     * one wrapper split across two - which is both what the columns need and what
     * the printed book wants: two half-tables, not one table with a hole in it.
     */
    const fragmentNode = (node, budget, wrap) => {
      const tag = node.tagName.toLowerCase();
      const height = occupied(node);
      const columns = widthIn(node);
      const label = labelOf(node);

      if (height <= budget) return [{ wrap, nodes: [node], height, columns, tag, label }];

      if (tag === 'table') return fragmentTable(node, budget, wrap);

      const kids = [...node.children].filter((child) => {
        const childTag = child.tagName.toLowerCase();
        return childTag !== 'template' && childTag !== 'script' && childTag !== 'style';
      });

      // Nothing inside it to break at, so it is not broken. A paragraph with no
      // block boundary in it goes to the plan whole, and the plan is what decides
      // whether the sheet can hold it: a long paragraph prints down both columns,
      // and one longer than the sheet spans its pages. Neither is clipping, and
      // the report says which happened rather than the artifact deciding quietly.
      if (kids.length === 0) {
        return [{ wrap, nodes: [node], height, columns, tag, label }];
      }

      const shell = shellOf(node);

      return kids.flatMap((kid) => fragmentNode(kid, budget, [...wrap, shell]));
    };

    /** Mark the elements that measured wider than their column. */
    const markWide = (sections) => {
      if (columnWidth === null) return;

      for (const section of sections) {
        const flow = section.querySelector('[data-handbook-flow]');
        if (flow === null) continue;

        const children = [...flow.children];
        for (const child of children) child.removeAttribute('data-handbook-wide');

        const boxes = children.map((child) => ({
          width: child.getBoundingClientRect().width,
          scrollWidth: child.scrollWidth,
        }));
        const wide = elementsWiderThanColumn({ columnWidth, boxes, tolerance: ${COLUMN_TOLERANCE_PX} });
        for (const index of wide) children[index].setAttribute('data-handbook-wide', '');
      }
    };

    /**
     * How tall a sheet painted, and therefore how many printed pages it takes.
     *
     * The painted extent rather than the box: the sheet box is a min-height box,
     * so a sheet whose content fits has a box a whole page tall whatever it holds,
     * and reading the box would report every sheet as exactly one page.
     */
    const measureSheet = (section) => {
      const rect = section.getBoundingClientRect();
      let bottom = rect.bottom;

      for (const descendant of section.querySelectorAll('*')) {
        bottom = Math.max(bottom, descendant.getBoundingClientRect().bottom);
      }

      const contentHeight = Math.ceil(bottom - rect.top);

      return { contentHeight, pages: Math.max(1, Math.ceil(contentHeight / sheet.height)) };
    };

    /** Build a flow's contents out of the pieces assigned to it. */
    const fill = (target, pieces) => {
      for (const piece of pieces) {
        let elements = piece.nodes;

        // Innermost first, so a piece's own copies of the ancestors it was broken
        // out of are rebuilt around it rather than shared with the piece beside it.
        for (let index = piece.wrap.length - 1; index >= 0; index -= 1) {
          const wrapper = shellOf(piece.wrap[index]);
          for (const node of elements) wrapper.appendChild(node);
          elements = [wrapper];
        }

        for (const element of elements) target.appendChild(element);
      }
    };

    /**
     * Note the blocks on a sheet that no sheet could hold.
     *
     * The plan decides, not the fragmentation: a piece that measured too tall may
     * still print down both columns of a sheet, and calling that oversized would
     * be reporting a fault in a book that has none. Recorded on the element rather
     * than in a list, so the report reads it back off the artifact instead of out
     * of the state of the run that made it.
     */
    const recordOversized = (section, plan, indices, pieces) => {
      for (const index of indices) {
        const entry = plan.oversized.find((candidate) => candidate.block === index);
        if (entry === undefined) continue;

        section.setAttribute('${OVERSIZED_ATTRIBUTE}', entry.name);
        section.setAttribute('${SPLIT_KIND_ATTRIBUTE}', entry.kind);
        section.setAttribute('${OVERSIZED_HEIGHT_ATTRIBUTE}', String(pieces[index].height));
      }
    };

    /**
     * Split one sheet that does not fit, and say how many sheets it became.
     *
     * The first sheet keeps its own box, its own title and its own position; the
     * rest are copies of it with the title left off, inserted after it in order.
     * The pieces are taken out of the flow before they are put back, because
     * re-appending a node that is already there moves it to the end - which would
     * print the book in a different order from the one it was written in, and
     * nothing about that is visible in the file.
     */
    const splitSheet = (section) => {
      const flow = section.querySelector('[data-handbook-flow]');
      if (flow === null) return 0;

      const heading = section.querySelector('h1');
      const reserve = parseFloat(getComputedStyle(flow).paddingBottom) || 0;
      // The title is page furniture above the measure, so the first sheet of a
      // source page has that much less room in it than a continuation does.
      const budget = sheet.height - reserve - (heading === null ? 0 : occupied(heading));
      const columns = columnsOf(section);

      const pieces = [...flow.children].flatMap((child) => fragmentNode(child, budget, []));
      const blocks = pieces.map((piece) => ({
        height: piece.height,
        columns: piece.columns,
        name: piece.label,
        kind: piece.tag,
        // The author's own horizontal rule, which is the break an automatic one
        // converges on. Honoured here and not reported, so that authoring it makes
        // the split disappear rather than merely move.
        authored: piece.tag === 'hr',
      }));

      const planned = planSheets({ blocks, blockCapacity: budget, columns });

      // The plan says this fits and the measurement said it does not, so the model
      // of the columns is wrong - which is what the re-measure pass exists for.
      // Planned again as one column, which cannot be wrong in the direction that
      // loses content: the worst it can do is break a sheet that did not need it.
      const plan =
        planned.sheets.length <= 1 ? planSheets({ blocks, blockCapacity: budget, columns: 1 }) : planned;

      if (plan.sheets.length <= 1) {
        recordOversized(section, plan, plan.sheets[0] ?? [], pieces);
        return 0;
      }

      const groups = plan.sheets.map((indices) => indices.map((index) => pieces[index]));

      flow.replaceChildren();
      fill(flow, groups[0]);
      recordOversized(section, plan, plan.sheets[0], pieces);

      let anchor = section;

      groups.slice(1).forEach((group, index) => {
        const continuation = section.cloneNode(false);
        continuation.removeAttribute('${SHEET_ATTRIBUTE}');

        fill(continuation.appendChild(flow.cloneNode(false)), group);
        recordOversized(continuation, plan, plan.sheets[index + 1], pieces);

        const split = plan.splits.find((entry) => entry.block === plan.sheets[index + 1][0]);
        if (split !== undefined) {
          continuation.setAttribute('${SPLIT_BEFORE_ATTRIBUTE}', split.name);
          continuation.setAttribute('${SPLIT_KIND_ATTRIBUTE}', split.kind);
        }

        anchor.after(continuation);
        anchor = continuation;
      });

      return groups.length - 1;
    };

    let sheets = [...document.querySelectorAll('[data-handbook-source]')];

    // Measure, split, measure again. Every pass reads what the last one laid out,
    // so a plan that turned out to be wrong costs a pass rather than a page, and
    // the loop ends when a pass finds nothing left to break - which is either
    // because everything fits or because what is left has no block boundary in it.
    // Every pass that splits adds a sheet, so the loop cannot run forever.
    for (let pass = 0; pass < ${MAX_SPLIT_PASSES}; pass += 1) {
      markWide(sheets);
      await relayout();

      // A sheet needs work when it does not fit, and also when it carries a break
      // the author wrote: a horizontal rule means "start a new sheet" whether or not the
      // content would have fitted without it, and honouring it only on the sheets
      // that overflow would print a book where the same rule means two things.
      const work = sheets.filter(
        (section) => measureSheet(section).pages > 1 || section.querySelector('[data-handbook-flow] hr') !== null
      );
      if (work.length === 0) break;

      const added = work.reduce((total, section) => total + splitSheet(section), 0);
      if (added === 0) break;

      sheets = [...document.querySelectorAll('[data-handbook-source]')];
    }

    sheets = [...document.querySelectorAll('[data-handbook-source]')];
    sheets.forEach((section, index) => section.setAttribute('${SHEET_ATTRIBUTE}', String(index + 1)));
    markWide(sheets);
    await relayout();

    // The number of sheets each source page became, which is what "part 2 of 5"
    // in the manifest is about. Counted here rather than during the split because
    // a source page can be split again by a later pass.
    const totalParts = new Map();
    for (const section of sheets) {
      const slug = section.getAttribute('data-handbook-source');
      totalParts.set(slug, (totalParts.get(slug) ?? 0) + 1);
    }
    const partOf = new Map();

    const published = sheets.map((section, index) => {
      const flow = section.querySelector('[data-handbook-flow]');
      const headings = flow === null ? [] : [...flow.querySelectorAll('h2, h3')];
      // The section a sheet *starts* in, because that is the one a reader turning
      // to this page needs: most of the eight source pages are several sections
      // long, and the last one on the sheet is the one they will be in by the time
      // they reach the bottom of the page.
      const sectionName = (headings[0] ?? headings[headings.length - 1])?.textContent?.trim() ?? '';
      const slug = section.getAttribute('data-handbook-source');
      const title = section.getAttribute('data-handbook-title') || '';
      const part = (partOf.get(slug) ?? 0) + 1;
      partOf.set(slug, part);

      addFooter(section, {
        title,
        section: sectionName,
        ornament,
        page: pageNumberLabel(index + 1, sheets.length),
      });

      const measured = measureSheet(section);
      const rect = section.getBoundingClientRect();

      return {
        number: index + 1,
        page: index + 1,
        slug,
        source: slug,
        title,
        part,
        parts: totalParts.get(slug),
        section: sectionName,
        columns: columnsOf(section),
        // Where the sheet sits in the document and how big its box turned out to
        // be, which is what a capture is clipped to and what the command checks
        // the sheets were laid out at the width the stylesheet declares.
        top: Math.round(rect.top + (window.scrollY || 0)),
        box: { width: Math.round(rect.width), height: Math.round(rect.height) },
        contentHeight: measured.contentHeight,
        pages: measured.pages,
        text: section.textContent ?? '',
      };
    });

    // Read back off the DOM rather than remembered from the split: the attribute
    // is what the artifact carries, so it is what the report and the manifest say.
    const splits = sheets
      .map((section, index) => {
        // A block the plan could not place is only reported when the layout agrees
        // that its sheet could not hold it. The plan reads the block's height as it
        // stands in the sheet it is being packed out of, and a block that changes
        // shape when it is given a sheet of its own - a paragraph whose contents
        // lay out in a list down a 306px column and in a row down the full width -
        // measures differently in the two places. The measurement is the authority
        // and the plan is only the guess, so a sheet that fits is not a fault and
        // is not reported as one.
        const oversized = published[index].pages > 1 ? section.getAttribute('${OVERSIZED_ATTRIBUTE}') : null;
        const before = section.getAttribute('${SPLIT_BEFORE_ATTRIBUTE}');
        const reported = {
          source: section.getAttribute('data-handbook-source'),
          sheet: index + 1,
          kind: section.getAttribute('${SPLIT_KIND_ATTRIBUTE}') || '',
        };

        if (oversized !== null) {
          return {
            ...reported,
            label: oversized,
            oversized: true,
            height: Number(section.getAttribute('${OVERSIZED_HEIGHT_ATTRIBUTE}')) || 0,
          };
        }

        return before === null ? null : { ...reported, label: before };
      })
      .filter((split) => split !== null);

    await settle();

    window.${LAYOUT_GLOBAL} = {
      sheet,
      page,
      columnWidth,
      ornament,
      // How tall the document turned out to be. The root element's automatic
      // height is the viewport rather than the content, so the paper painted on
      // it stops at the viewport - and a capture clipped to the page box of a
      // short last sheet would show flat colour down its bottom margin. The
      // command extends the root by the page's bottom margin for the captures.
      documentHeight: Math.max(
        document.documentElement.scrollHeight,
        document.body ? document.body.scrollHeight : 0
      ),
      splits,
      sheets: published,
    };
  };

  /** The footer each sheet carries: its chapter, its section and its page number. */
  const addFooter = (section, { title, section: sectionName, ornament, page }) => {
    const footer = document.createElement('footer');
    footer.setAttribute('data-handbook-footer', '');

    const left = document.createElement('div');
    left.setAttribute('data-handbook-footer-left', '');
    const sourceName = document.createElement('span');
    sourceName.setAttribute('data-handbook-footer-source', '');
    sourceName.textContent = title;
    const sectionElement = document.createElement('span');
    sectionElement.setAttribute('data-handbook-footer-section', '');
    sectionElement.textContent = sectionName;
    left.append(sourceName, sectionElement);

    const ornamentImage = document.createElement('img');
    ornamentImage.setAttribute('data-handbook-footer-ornament', '');
    ornamentImage.setAttribute('src', ornament);
    // Decorative: it says nothing a reader needs, and an empty alt is what
    // keeps it out of the artifact's text.
    ornamentImage.setAttribute('alt', '');

    const pageNumber = document.createElement('span');
    pageNumber.setAttribute('data-handbook-footer-page', '');
    pageNumber.textContent = page;

    footer.append(left, ornamentImage, pageNumber);
    section.appendChild(footer);
  };

  // The promise is returned so a caller that evaluates this directly can await
  // the measurement; the document-start injection ignores it.
  return document.readyState === 'loading'
    ? new Promise((done) =>
        document.addEventListener('DOMContentLoaded', () => assignSheets().then(done), { once: true })
      )
    : assignSheets();
})()`;
}
