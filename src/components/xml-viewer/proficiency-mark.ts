// The card's proficiency mark: one gold coin, one screen-reader word.
//
// It started in `SavesTable.astro`, where a proficient saving throw draws a dot
// beside the ability name. The Abilities tiles then wanted the same mark beside
// the save figure, and a character that looked untrained on the Overview tile and
// proficient in the Saving Throws table was disagreeing with itself inside one
// card - the tile prints `SAVE +7` and nothing else, so a Fighter's ability plus
// proficiency and a Wizard's raw Intelligence looked identical.
//
// The colour and the shape therefore live here rather than at either call site. A
// mark that is "the same" by convention is the same until the second place edits
// its hex value, and a reader learns a legend once. `proficiencyMarkLabel` is the
// other half of that: proficiency is never carried by colour or shape alone.
export const proficiencyCoinClass = 'w-1.5 h-1.5 rounded-full bg-[#c68000]';

// The visually hidden text that carries proficiency to assistive tech. The glyph
// itself is `aria-hidden`, so this word is the whole of the mark's meaning there.
export const proficiencyMarkLabel = 'Proficient';
