// The card's section index: one list, so the tab bar, the panels and the Alpine
// component cannot disagree about what a section is called or in what order it
// appears.
//
// The order is the reading order of a printed character sheet, not an arbitrary
// list: identity first, then abilities (Skills, Spellcasting), then the two things
// a character is judged on at the table (Inventory, Weapons), then what they can
// do (Features, Powers). Inventory sits before Weapons because that is the order
// every published character sheet uses, and because the reader usually wants to
// know what a character is carrying before what they are holding. Spellcasting
// sits with Skills rather than down among the powers because it is an
// ability-derived summary - the casting ability, the Save DC and the attack bonus
// are all read off one ability - and a sheet prints those numbers beside its
// ability scores, not beside its spell list. Overview leads because it is the one
// section that is never empty - Vitals and Abilities render for every character -
// so it is always a valid landing section.
//
// `label` is the tab's own name and may be shorter than the section heading
// underneath it. The tab bar is an index; the headings are the sheet's outline.
// Keeping both is the point, so neither borrows the other's wording by accident.
// Weapons is the one section where the two agree: it used to be headed "Equipped
// Weapons", the tab's word plus a qualifier, and it now holds a second table of
// carried weapons as well, so the honest name for the whole is the tab's.
export const CARD_TABS = [
  { id: 'overview', label: 'Overview' },
  { id: 'skills', label: 'Skills' },
  { id: 'spellcasting', label: 'Spellcasting' },
  { id: 'inventory', label: 'Inventory' },
  { id: 'weapons', label: 'Weapons' },
  { id: 'features', label: 'Features' },
  { id: 'powers', label: 'Powers' },
] as const;

export type CardTabId = (typeof CARD_TABS)[number]['id'];