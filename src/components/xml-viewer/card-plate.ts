// The plate every card section's contents sit on: a recessed surface with a
// heavy top rule in the theme's accent, one stat-tile cap rather than a
// hairline. It started life as `vitalsItemClass` inside XmlCard.astro, back when
// only the Vitals block used it, and grew to Abilities, Passive Skills,
// Saving Throws, Skills, Inventory, Equipped Weapons, Features and Powers.
//
// It moved here so the Skills and Saves tables can own their own card shell.
// Those two sections render at medium and large, and the whole point of the
// medium treatment is that it is the *same* card with fewer rows - so the plate
// cannot live in the parent that decides which one to render.
export const cardPlateClass =
  'p-2 bg-gray-50 dark:bg-gray-900 border border-gray-300 dark:border-gray-600 border-t-[3px] border-t-[#58180d] dark:border-t-[#c68000] rounded-[7px]';
