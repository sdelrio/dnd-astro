// The index's content model, as a rulebook's own table of parts.
//
// The order here is the reading order, and the folio is not decoration: it is
// the address a player quotes across the table ("look up nine"). The incumbent
// page numbered nothing and instead opened with a row of LinkButtons that
// repeated six of the entries listed immediately below it, so the Dice Roller
// appeared as a button and then never again as the entry it is. One ordered
// model removes both faults: every destination appears exactly once, with a
// stable address, and the tools are reachable from the same index as the rules.

/** Where a player actually needs an entry. Drives nothing but the copy. */
export type RulebookCue = 'table' | 'session' | 'build' | 'lookup';

export interface RulebookEntry {
	/** The entry's address in the rulebook. Unique across the whole index. */
	folio: string;
	title: string;
	href: string;
	/** What is actually on the page. Factual, and written to be scanned. */
	description: string;
	/** Iconify name, drawn from the sets this site already ships. */
	icon: string;
	cue: RulebookCue;
}

export interface RulebookPart {
	/** Roman numeral. Carries the sticky spine and the desktop gutter. */
	numeral: string;
	title: string;
	/** What this part is for, in one clause. */
	standfirst: string;
	entries: RulebookEntry[];
}

export const rulebookParts: RulebookPart[] = [
	{
		numeral: 'I',
		title: 'House Rules',
		standfirst: 'What we decided the game is.',
		entries: [
			{
				folio: '1',
				title: 'Classes',
				href: '/dnd/classes/',
				description: 'Character archetypes, custom balance, and fixes for homebrew content.',
				icon: 'game-icons:character',
				cue: 'build',
			},
			{
				folio: '2',
				title: 'Character Creation',
				href: '/dnd/character-creation/',
				description: 'Standardized character creation guides and processes.',
				icon: 'mdi:account-plus',
				cue: 'build',
			},
			{
				folio: '3',
				title: 'Feats',
				href: '/dnd-tools/feat-explorer/',
				description: 'Feat options, customizations, and balance adjustments.',
				icon: 'game-icons:laurels',
				cue: 'build',
			},
			{
				folio: '4',
				title: 'Skills',
				href: '/dnd/skills/',
				description: 'Skill system details and specific mechanics for gameplay.',
				icon: 'game-icons:skills',
				cue: 'table',
			},
			{
				folio: '5',
				title: 'Magic Fixes',
				href: '/dnd/magic/',
				description: 'Spellcasting rules, spell lists, and custom balance and fixes.',
				icon: 'game-icons:magic-swirl',
				cue: 'table',
			},
			{
				folio: '6',
				title: 'Injuries',
				href: '/dnd/injuries/',
				description: 'Injury treatment and related mechanics for realistic consequences.',
				icon: 'game-icons:bandage-roll',
				cue: 'table',
			},
		],
	},
	{
		numeral: 'II',
		title: 'Reference',
		standfirst: 'What to look up mid-session.',
		entries: [
			{
				folio: '7',
				title: 'Armor Table',
				href: '/dnd/master-armor-table/',
				description: 'Complete armor equipment stats and protective properties.',
				icon: 'game-icons:breastplate',
				cue: 'lookup',
			},
			{
				folio: '8',
				title: 'Weapon Mastery Fixes',
				href: '/dnd/weapon-mastery/',
				description: 'Weapon mastery balance patches and rule refinements.',
				icon: 'game-icons:master-of-arms',
				cue: 'lookup',
			},
			{
				folio: '9',
				title: 'Weapon Properties',
				href: '/dnd/weapon-properties/',
				description: 'Detailed weapon properties and their mechanical effects.',
				icon: 'game-icons:crossed-swords',
				cue: 'lookup',
			},
		],
	},
	{
		numeral: 'III',
		title: 'Tools',
		standfirst: 'What to hold in your hands at the table.',
		entries: [
			{
				folio: '10',
				title: 'Dice Roller',
				href: '/dnd-tools/dice-roller/',
				description: 'Roll any die, any count, and keep the log between rolls.',
				icon: 'game-icons:dice-twenty-faces-twenty',
				cue: 'table',
			},
			{
				folio: '11',
				title: 'Point Buy',
				href: '/dnd-tools/point-buy/',
				description: 'Spend a 27-point budget across your six ability scores.',
				icon: 'mdi:numeric',
				cue: 'build',
			},
			{
				folio: '12',
				title: 'Current Party',
				href: '/fantasy-grounds/current-party/',
				description: 'The active characters and their essential stats, as they stand now.',
				icon: 'mdi:account-group',
				cue: 'session',
			},
			{
				folio: '13',
				title: 'Character Browser',
				href: '/fantasy-grounds/character-search/',
				description: 'Search and browse every Fantasy Grounds character by name and class.',
				icon: 'mdi:account-search',
				cue: 'session',
			},
			{
				folio: '14',
				title: 'Campaign Design Tools',
				href: '/dnd-tools/tools-for-campaign/',
				description: 'Procedural map generators and reference resources for tabletop planning.',
				icon: 'game-icons:treasure-map',
				cue: 'session',
			},
			{
				folio: '15',
				title: 'FG Effects',
				href: '/fantasy-grounds/fg-effects/',
				description: 'Automation tips, conditional operators, and custom effects for Fantasy Grounds.',
				icon: 'mdi:magic-staff',
				cue: 'session',
			},
		],
	},
];
