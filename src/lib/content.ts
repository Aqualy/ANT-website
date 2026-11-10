/**
 * Site copy. ANT (Adaptive Network of Trust) is always the *system*;
 * the Blackout Communication Kit is always the *physical kit*.
 */

export const brand = {
	name: 'ANT',
	fullName: 'Adaptive Network of Trust',
	kitName: 'Blackout Communication Kit'
} as const;

export const nav = [
	{ label: 'ANT', href: '/#home' },
	{ label: 'How it works', href: '/#how-it-works' },
	{ label: 'The Kit', href: '/#the-kit' },
	{ label: 'Get involved', href: '/#get-involved' },
	{ label: 'Resources', href: '/resources' }
] as const;

/* ---------- How it works ---------- */

export type DiagramNodeId = 'residents' | 'hub' | 'printed' | 'wayfinding' | 'meeting' | 'neighbours';

export type DiagramNode = {
	id: DiagramNodeId;
	title: string;
	text: string;
	/** position in the 1000 x 620 diagram space */
	x: number;
	y: number;
	shape: 'circle' | 'square' | 'sheet' | 'arrow' | 'pin';
};

export const diagramNodes: DiagramNode[] = [
	{
		id: 'residents',
		title: 'Residents',
		text: 'People who live near each other get to know one another before they need to. Trust starts here.',
		x: 140,
		y: 150,
		shape: 'circle'
	},
	{
		id: 'hub',
		title: 'Community hub',
		text: 'An agreed local place where information is collected, checked and posted for everyone.',
		x: 500,
		y: 310,
		shape: 'square'
	},
	{
		id: 'printed',
		title: 'Printed materials',
		text: 'Posters, cards and maps carry information on paper, so nothing depends on a screen.',
		x: 500,
		y: 80,
		shape: 'sheet'
	},
	{
		id: 'wayfinding',
		title: 'Wayfinding',
		text: 'Shared symbols in public space point people to hubs and meeting points.',
		x: 860,
		y: 150,
		shape: 'arrow'
	},
	{
		id: 'meeting',
		title: 'Meeting point',
		text: 'A known spot where residents gather and volunteers pass on checked information by word of mouth.',
		x: 860,
		y: 480,
		shape: 'pin'
	},
	{
		id: 'neighbours',
		title: 'Neighbours',
		text: 'People who read an update share it with the people around them, and the network grows.',
		x: 140,
		y: 480,
		shape: 'circle'
	}
];

export const diagramLinks: [DiagramNodeId, DiagramNodeId][] = [
	['residents', 'hub'],
	['printed', 'hub'],
	['hub', 'wayfinding'],
	['wayfinding', 'meeting'],
	['hub', 'meeting'],
	['hub', 'neighbours'],
	['neighbours', 'residents'],
	['meeting', 'neighbours']
];

/** Illustrative example: one update travelling through a neighbourhood. */
export const exampleUpdate = [
	{ node: 'hub', text: 'A community hub posts an update using ANT symbols.' },
	{ node: 'residents', text: 'Residents passing by read the sign.' },
	{ node: 'neighbours', text: 'They tell the neighbours on their street.' },
	{ node: 'meeting', text: 'Everyone meets at the agreed meeting point.' }
] as const satisfies readonly { node: DiagramNodeId; text: string }[];

/** Pillars — limited to what the project references define. */
export const pillars = [
	{
		title: 'Community',
		text: 'Residents get to know one another and practise together through workshops and simulations.'
	},
	{
		title: 'Visual',
		text: 'A shared set of symbols and signs marks information points and displays important updates.'
	},
	{
		title: 'Spoken word',
		text: 'At known meeting points, volunteers pass on checked information in person.'
	}
] as const;

/* ---------- The Kit ---------- */

export type KitItemId = 'language' | 'map' | 'cards' | 'profiles' | 'tokens' | 'signage';

export type KitItem = {
	id: KitItemId;
	title: string;
	form: string;
	description: string;
	example: string;
};

export const kitItems: KitItem[] = [
	{
		id: 'language',
		title: 'Visual Language Kit',
		form: 'Printed pictogram sheets',
		description: 'A starter set of shared pictograms for public information on paper.',
		example: 'Use a symbol to mark an information point so anyone can recognise it.'
	},
	{
		id: 'map',
		title: 'Neighbourhood Map',
		form: 'Folded paper map',
		description: 'A paper guide to the meeting and information points in your area.',
		example: 'Find the place where your neighbours have agreed to meet.'
	},
	{
		id: 'cards',
		title: 'Community Cards',
		form: 'Deck of cards in a band',
		description: 'Prompts for workshops and blackout practice scenarios.',
		example: 'Draw a card and practise sharing an update without phones.'
	},
	{
		id: 'profiles',
		title: 'Paper Profiles',
		form: 'Stack of profile cards',
		description: 'A social profile on paper for your interests, stories and messages.',
		example: 'Pin your profile at the hub and meet a neighbour with a shared interest.'
	},
	{
		id: 'tokens',
		title: 'Interest Tokens',
		form: 'Tokens and sticker sheet',
		description: 'Small physical markers that show interests and participation.',
		example: 'Add a sticker to your paper profile to show what you can help with.'
	},
	{
		id: 'signage',
		title: 'Community Hub Signage',
		form: 'Folded signs',
		description: 'Printed signs that clearly label the places where information is shared.',
		example: 'Put up a sign so everyone can find the local information point.'
	}
];

/* ---------- Get involved ---------- */

export const prepareSteps = [
	{ title: 'Connect', description: 'Get to know the people around you.' },
	{ title: 'Learn', description: 'Discover the signs and materials you can use together.' },
	{ title: 'Prepare', description: 'Agree on meeting points and organise local workshops.' },
	{ title: 'Practise', description: 'Test simple scenarios with your neighbours using the cards.' }
] as const;

/* ---------- Resources ---------- */

export type ResourceStatus = 'concept' | 'coming-soon';

export type Resource = {
	id: string;
	category: string;
	title: string;
	text: string;
	status: ResourceStatus;
	preview: 'poster' | 'pictograms' | 'map' | 'cards' | 'profile' | 'tokens' | 'guide';
	/** Only set when a real, final file exists in /static. None are supplied yet. */
	file?: string;
};

export const resources: Resource[] = [
	{
		id: 'posters',
		category: 'Posters',
		title: 'Campaign posters',
		text: 'Posters that introduce ANT in shared spaces like stairwells, shops and libraries.',
		status: 'concept',
		preview: 'poster'
	},
	{
		id: 'pictograms',
		category: 'Pictograms',
		title: 'Visual language starter set',
		text: 'Simple symbols for information points, meeting points and updates.',
		status: 'coming-soon',
		preview: 'pictograms'
	},
	{
		id: 'map',
		category: 'Maps',
		title: 'Neighbourhood map template',
		text: 'A blank map to mark your local hub, meeting point and information points.',
		status: 'concept',
		preview: 'map'
	},
	{
		id: 'cards',
		category: 'Community and scenario cards',
		title: 'Community Cards',
		text: 'Prompts for workshops and practice scenarios with your neighbours.',
		status: 'coming-soon',
		preview: 'cards'
	},
	{
		id: 'profiles',
		category: 'Paper profiles',
		title: 'Paper Profile',
		text: 'A one-page profile for your interests, stories and messages.',
		status: 'concept',
		preview: 'profile'
	},
	{
		id: 'tokens',
		category: 'Interest tokens',
		title: 'Interest tokens and stickers',
		text: 'Cut-out tokens and stickers to show interests and participation.',
		status: 'coming-soon',
		preview: 'tokens'
	},
	{
		id: 'guide',
		category: 'Preparation guide',
		title: 'Getting started guide',
		text: 'Step-by-step instructions to connect, learn, prepare and practise with your neighbours.',
		status: 'coming-soon',
		preview: 'guide'
	}
];
