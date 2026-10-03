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
 * Two decisions the assignment makes, both from measurements rather than from
 * what the markup looks like:
 *
 *   - **What spans both columns.** A table wider than its column is the expected
 *     case in this book, not the exception, and there are two shapes of it: the
 *     table itself, and a scroll container whose own box fits while the table
 *     inside it does not. Reading both `width` and `scrollWidth` is what catches
 *     the second one; guessing from a tag name catches neither reliably.
 *   - **What each footer's page number says.** The total is the sheet count,
 *     which is known as soon as every source page has been measured, and the
 *     format is the command's rather than a second copy of it here.
 */

import { COLUMN_TOLERANCE_PX, elementsWiderThanColumn, pageNumberLabel } from './handbook-helpers.mjs';

/**
 * The name `elementsWiderThanColumn`'s own default argument refers to.
 *
 * Named rather than repeated so the injected copy of that function finds the
 * same tolerance the module has, rather than failing on an identifier that does
 * not exist in the browser.
 */
const COLUMN_TOLERANCE_PX_NAME = 'COLUMN_TOLERANCE_PX';

/** The attribute that marks a source page as a sheet, carrying its number. */
export const SHEET_ATTRIBUTE = 'data-handbook-sheet';

/** Where the assignment publishes what it measured, for the command to read. */
export const LAYOUT_GLOBAL = '__handbookLayout';

export function sheetAssignmentScript() {
  // The two decisions the assignment delegates - the page-number format and what
  // is too wide for its column - are embedded as their own source rather than
  // retyped into this string. That is what keeps the "12 of 48" a reader sees in
  // the artifact, and the tolerance that decides whether a table spans, the same
  // implementations the command's tests assert from, instead of two copies that
  // happen to agree today.
  const embed = (fn) => `const ${fn.name} = ${fn.toString()};`;

  return `(() => {
  ${embed(pageNumberLabel)}
  ${embed(elementsWiderThanColumn)}
  const ${COLUMN_TOLERANCE_PX_NAME} = ${COLUMN_TOLERANCE_PX};

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

    const sources = [...document.querySelectorAll('[data-handbook-source]')];
    const total = sources.length;

    const sheets = sources.map((source, index) => {
      // The painted extent rather than scrollHeight: what occupies pages is the
      // bottom of the last thing that gets painted, and a margin that collapses
      // out of the box does not. Read before the box is applied, because applying
      // it is what would clamp the height being measured.
      const before = source.getBoundingClientRect();
      let bottom = before.bottom;
      for (const element of source.querySelectorAll('*')) {
        bottom = Math.max(bottom, element.getBoundingClientRect().bottom);
      }

      const contentHeight = Math.ceil(bottom - before.top);
      source.setAttribute('${SHEET_ATTRIBUTE}', String(index + 1));

      // Read back after applying it, so what is published is the box that was
      // laid out rather than the one the content happened to need.
      const box = source.getBoundingClientRect();

      return {
        element: source,
        number: index + 1,
        slug: source.getAttribute('data-handbook-source'),
        title: source.getAttribute('data-handbook-title') || '',
        contentHeight,
        pages: Math.max(1, Math.ceil(contentHeight / sheet.height)),
        box: { width: Math.round(box.width), height: Math.round(box.height) },
      };
    });

    // Applied after every sheet has been measured, because a footer is measured
    // content too and adding it halfway through would give the first sheets a
    // different height from the last.
    sheets.forEach(({ element: source, title }, index) => {
      const flow = source.querySelector('[data-handbook-flow]');

      if (flow && columnWidth !== null) {
        const children = [...flow.children];
        const boxes = children.map((child) => ({ width: child.getBoundingClientRect().width, scrollWidth: child.scrollWidth }));
        const wide = elementsWiderThanColumn({ columnWidth, boxes, tolerance: ${COLUMN_TOLERANCE_PX} });
        for (const childIndex of wide) children[childIndex].setAttribute('data-handbook-wide', '');
      }

      const headings = flow ? [...flow.querySelectorAll('h2, h3')] : [];
      // The section a sheet *starts* in, because that is the one a reader turning
      // to this page needs: most of the eight source pages are several sections
      // long, and the last one on the sheet is the one they will be in by the time
      // they reach the bottom of the page.
      const section = (headings[0] ?? headings[headings.length - 1])?.textContent?.trim() ?? '';

      const footer = document.createElement('footer');
      footer.setAttribute('data-handbook-footer', '');

      const left = document.createElement('div');
      left.setAttribute('data-handbook-footer-left', '');
      const sourceName = document.createElement('span');
      sourceName.setAttribute('data-handbook-footer-source', '');
      sourceName.textContent = title;
      const sectionName = document.createElement('span');
      sectionName.setAttribute('data-handbook-footer-section', '');
      sectionName.textContent = section;
      left.append(sourceName, sectionName);

      const ornamentImage = document.createElement('img');
      ornamentImage.setAttribute('data-handbook-footer-ornament', '');
      ornamentImage.setAttribute('src', ornament);
      // Decorative: it says nothing a reader needs, and an empty alt is what
      // keeps it out of the artifact's text.
      ornamentImage.setAttribute('alt', '');

      const pageNumber = document.createElement('span');
      pageNumber.setAttribute('data-handbook-footer-page', '');
      pageNumber.textContent = pageNumberLabel(index + 1, total);

      footer.append(left, ornamentImage, pageNumber);
      source.appendChild(footer);
    });

    // Measured again, after every mutation above. Marking an element as spanning
    // both columns and appending a footer both change what the sheets measure, and
    // the document offsets a capture is clipped to are only correct once the
    // document has stopped moving.
    //
    // The painted extent rather than the box: the sheet box is a min-height box,
    // so a sheet whose content fits has a box a whole page tall whatever it holds,
    // and reading the box would report every source page as exactly one page.
    for (const entry of sheets) {
      const element = entry.element;
      const rect = element.getBoundingClientRect();
      let bottom = rect.bottom;

      for (const descendant of element.querySelectorAll('*')) {
        bottom = Math.max(bottom, descendant.getBoundingClientRect().bottom);
      }

      entry.top = Math.round(rect.top + (window.scrollY || 0));
      entry.contentHeight = Math.ceil(bottom - rect.top);
      entry.pages = Math.max(1, Math.ceil(entry.contentHeight / sheet.height));
    }

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
      sheets: sheets.map(({ element, ...published }) => published),
    };
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
