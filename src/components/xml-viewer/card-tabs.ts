// The card's section index: one list, so the tab bar, the panels and the Alpine
// component cannot disagree about what a section is called or in what order it
// appears.
//
// The order is the reading order of a printed character sheet, not an arbitrary
// list: identity first, then abilities (Skills), then the two things a character
// is judged on at the table (Inventory, Weapons), then what they can do (Features,
// Powers). Inventory sits before Weapons because that is the order every published
// character sheet uses, and because the reader usually wants to know what a
// character is carrying before what they are holding. Overview leads because it is
// the one section that is never empty - Vitals and Abilities render for every
// character - so it is always a valid landing section.
//
// `label` is the tab's own name and may be shorter than the section heading
// underneath it: the Weapons tab is "Weapons" while the section it opens is
// "Equipped Weapons". The tab bar is an index; the headings are the sheet's
// outline. Keeping both is the point, so neither borrows the other's wording by
// accident.
export const CARD_TABS = [
  { id: 'overview', label: 'Overview' },
  { id: 'skills', label: 'Skills' },
  { id: 'inventory', label: 'Inventory' },
  { id: 'weapons', label: 'Weapons' },
  { id: 'features', label: 'Features' },
  { id: 'powers', label: 'Powers' },
] as const;

export type CardTabId = (typeof CARD_TABS)[number]['id'];