import { CARD_TABS, type CardTabId } from './card-tabs';

/**
 * Registered with `Alpine.data('xmlCard', ...)`.
 *
 * The card's section navigation, per card instance. Every helper the template's
 * expressions call is a property here, so nothing in this card reaches for a
 * global - ADR-0010.
 *
 * TYPE-ONLY on the `./card-tabs` edge above would be wrong: `CARD_TABS` is read at
 * runtime by `init()` to label an empty tab, so it is a value edge. The module is
 * a leaf with no imports, which is what keeps that edge safe (ADR-0013).
 */
export interface XmlCardComponent {
  $el: HTMLElement;
  /** The sections this card actually rendered, in reading order. */
  tabs: CardTabId[];
  active: CardTabId;
  /** Prefix for this instance's tab and panel ids. Unique per mounted card. */
  uid: string;
  init(): void;
  isActive(id: CardTabId): boolean;
  select(id: CardTabId): void;
  /**
   * Keyboard navigation across the tablist, handling every key itself rather
   * than taking a delta from the template. An Alpine expression is a string and
   * nothing type-checks it, so the four-key decision belongs in the module the
   * test can import, not in an attribute a reader has to trust.
   */
  step(event: KeyboardEvent): void;
  focusTab(id: CardTabId): void;
  tabId(id: CardTabId): string;
  panelId(id: CardTabId): string;
}

/** One per mounted card. Cards do not share a namespace: the party page renders six. */
let instances = 0;

/**
 * The tab pattern's own rules, in one place:
 *
 * - `aria-selected` carries the state, never colour alone.
 * - Roving `tabindex`: the active tab is the tablist's only tab stop, so Tab
 *   leaves the bar in one press instead of walking six, and the arrows move
 *   within it.
 * - Activation follows focus. The panels are all in the DOM and hidden with
 *   `x-show`, so revealing one is a display write rather than a fetch, and
 *   waiting for a second press to activate a panel the user has already reached
 *   would only add a keystroke.
 * - Every panel keeps `tabindex="0"` so a keyboard user can scroll a long table
 *   that overflows its box, which is the one thing a `tabpanel` must be able to
 *   receive focus for.
 */
export function xmlCardComponent(): XmlCardComponent {
  return {
    $el: undefined as unknown as HTMLElement,
    tabs: [],
    active: 'overview',
    uid: '',
    init() {
      instances += 1;
      this.uid = `xmlcard-${instances}`;
      const rendered = (this.$el.dataset.cardTabs ?? '')
        .split(' ')
        .map((id) => id.trim())
        .filter((id): id is CardTabId => CARD_TABS.some((tab) => tab.id === id));

      // An `x-show` panel is present in the DOM whether or not it is showing, so
      // an id pair is only wired for a section the card actually rendered. A
      // tab bar promising a panel that is not there would be an aria-controls
      // pointing at nothing.
      this.tabs = rendered;
      if (!this.tabs.includes(this.active)) {
        this.active = this.tabs[0] ?? 'overview';
      }
      for (const id of this.tabs) {
        const tab = this.$el.querySelector<HTMLElement>(`[data-tab="${id}"]`);
        const panel = this.$el.querySelector<HTMLElement>(`[data-panel="${id}"]`);
        if (!tab || !panel) continue;
        const tabId = this.tabId(id);
        const panelId = this.panelId(id);
        tab.id = tabId;
        tab.setAttribute('aria-controls', panelId);
        panel.id = panelId;
        panel.setAttribute('aria-labelledby', tabId);
      }
    },
    isActive(id: CardTabId) {
      return this.active === id;
    },
    select(id: CardTabId) {
      if (this.tabs.includes(id)) this.active = id;
    },
    /**
     * Wraps at both ends, and moves selection with focus: the tab the arrow
     * lands on is the tab that opens. `preventDefault()` stops the arrow
     * scrolling the page out from under the reader mid-tablist.
     *
     * Home and End jump to the ends rather than stepping, because that is what
     * a reader pressing Home in a six-item bar is asking for.
     */
    step(event: KeyboardEvent) {
      if (this.tabs.length === 0) return;
      const from = this.tabs.indexOf(this.active);
      const last = this.tabs.length - 1;
      let next: number;
      switch (event.key) {
        case 'ArrowRight':
        case 'ArrowDown':
          next = (from + 1) % this.tabs.length;
          break;
        case 'ArrowLeft':
        case 'ArrowUp':
          next = (from - 1 + this.tabs.length) % this.tabs.length;
          break;
        case 'Home':
          next = 0;
          break;
        case 'End':
          next = last;
          break;
        default:
          return;
      }
      event.preventDefault();
      this.active = this.tabs[next];
      this.focusTab(this.active);
    },
    /**
     * The tab that just became selected has to hold focus, or an arrow press
     * moves the panel and leaves the caret on the tab it came from - and with a
     * roving tabindex, the next arrow press would then start from the wrong tab.
     */
    focusTab(id: CardTabId) {
      this.$el.querySelector<HTMLElement>(`[data-tab="${id}"]`)?.focus();
    },
    tabId(id: CardTabId) {
      return `${this.uid}-tab-${id}`;
    },
    panelId(id: CardTabId) {
      return `${this.uid}-panel-${id}`;
    },
  };
}