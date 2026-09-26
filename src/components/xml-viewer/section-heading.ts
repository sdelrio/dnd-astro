// The one heading treatment for every card section, at every display mode.
//
// It used to live in XmlCard.astro and only covered the dense upper region
// (Overview, Vitals, Abilities, Passive Skills, Saving Throws). Skills,
// Inventory, Equipped Weapons, Features and Powers went through SectionHeader
// instead, whose `h3` declared no font-size, so it inherited Starlight's content
// h3 size - 16.38px sentence case against 11.2px uppercase, nearly 1.5x. The
// card read as two heading systems and medium mode mixed them inside one
// column. Both call sites now share this class.
//
// Type only, deliberately: the margin is left to the call site. Carrying `mb-2`
// here meant SectionHeader's flex-row variant had to append `mb-0` to cancel it,
// which put two conflicting margin utilities in one class attribute and made
// the winner depend on stylesheet order rather than on the markup.
//
// Section labels were absolutely-positioned tabs at `opacity-0` that only
// appeared on hover. That hid them from keyboard focus entirely and from touch
// users completely, while `title` on the sibling dots gave no text alternative.
// They are now real, always-visible headings in normal flow: a compact
// uppercase micro-label on the gold rule, so the section is legible without a
// pointer and reaches the document outline.
export const sectionHeadingClass =
  'mt-0 font-semibold text-[0.7rem] uppercase tracking-[0.08em] text-(color:--sl-color-accent-high)';

// The value that sits on a heading's baseline (Inventory's carried weight).
// DESIGN.md's Micro Value step, 10px, so it stays below the 11.2px label
// instead of out-sizing the heading it annotates.
export const sectionHeadingTrailingClass =
  'text-[0.625rem] uppercase tracking-[0.06em] text-gray-500 dark:text-gray-400';

// The steps below a section heading, on the same ramp. Both used to sit at
// 12px, which was a step *under* the old 16.38px SectionHeader and a step *over*
// the 11.2px micro-label - a subheading out-sizing its parent. 10px is
// DESIGN.md's Micro Value, the card ramp's smallest type after the 9px HP
// label; case and weight carry the level difference, not size.
//
// The `text-gray-500` on these two loses to the docs layer's
// `.sl-markdown-content :is(h1..h6)` heading-ink rule, which is Oxblood in
// light and Gold Leaf in dark. That is on-system - Oxblood is the documented
// light heading ink - so it is left standing and the step is carried by size,
// case and weight alone. Remove the class only with that rule.
export const sectionSubheadingClass =
  'text-[0.625rem] font-semibold uppercase tracking-[0.06em] text-gray-500 dark:text-gray-400';

// A power group's name, one step softer than its "Level N" subheading.
export const sectionGroupClass =
  'text-[0.625rem] font-medium text-gray-500 dark:text-gray-400';

// The proficiency and prepared-dot legends under the Skills and Powers tables.
// Also statblock legends, so also 10px, for the same reason.
export const sectionLegendClass = 'text-[0.625rem] text-gray-500 dark:text-gray-400';
