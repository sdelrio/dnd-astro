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
 * failure would be a document that paginates at a size nobody chose.
 */

/** The attribute that marks a source page as a sheet, carrying its number. */
export const SHEET_ATTRIBUTE = 'data-handbook-sheet';

/** Where the assignment publishes what it measured, for the command to read. */
export const LAYOUT_GLOBAL = '__handbookLayout';

export function sheetAssignmentScript() {
  return `(() => {
  const assignSheets = async () => {
    const readLength = (name) => {
      const value = parseFloat(getComputedStyle(document.documentElement).getPropertyValue(name));
      return Number.isFinite(value) && value > 0 ? value : null;
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

    // Measured after the faces settle, because a heading set in the fallback face
    // wraps into fewer lines than the same heading in Cinzel: measured early,
    // Character Creation came out 678px short of its printed height, which is a
    // page of difference in a document whose page count this run then checks.
    if (document.fonts && document.fonts.ready) {
      await document.fonts.ready;
    }

    const settle = () =>
      new Promise((done) => requestAnimationFrame(() => requestAnimationFrame(() => setTimeout(done, 0))));

    const sheets = [...document.querySelectorAll('[data-handbook-source]')].map((source, index) => {
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
        slug: source.getAttribute('data-handbook-source'),
        title: source.getAttribute('data-handbook-title') || '',
        contentHeight,
        pages: Math.max(1, Math.ceil(contentHeight / sheet.height)),
        box: { width: Math.round(box.width), height: Math.round(box.height) },
      };
    });

    await settle();
    window.${LAYOUT_GLOBAL} = { sheet, sheets };
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