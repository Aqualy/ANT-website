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
	{ label: 'How it works', href: '/#how-it-works' },
	{ label: 'The Kit', href: '/#the-kit' },
	{ label: 'Get involved', href: '/#get-involved' },
	{ label: 'Resources', href: '/resources' }
] as const;

/* ---------- How it works ---------- */

export type NodeId = 'residents' | 'hub' | 'printed' | 'neighbours' | 'wayfinding' | 'meeting';

/** The parts of the network, drawn as blobs in the story scene. */
export const networkNodes: { id: NodeId; label: string }[] = [
	{ id: 'residents', label: 'Residents' },
	{ id: 'hub', label: 'Community hub' },
	{ id: 'printed', label: 'Printed update' },
	{ id: 'neighbours', label: 'Neighbours' },
	{ id: 'wayfinding', label: 'Wayfinding' },
	{ id: 'meeting', label: 'Meeting point' }
];

/**
 * Illustrative example: one update travelling through a neighbourhood.
 * Each step lights up a node and grows a connection from the `from` nodes.
 */
export const story: { node: NodeId; from: NodeId[]; title: string; text: string }[] = [
	{
		node: 'residents',
		from: [],
		title: 'It starts with people',
		text: 'Residents get to know one another long before they need to. Trust is what the network runs on.'
	},
	{
		node: 'hub',
		from: ['residents'],
		title: 'News reaches the hub',
		text: 'A resident brings news to the agreed community hub. There it is checked and written down.'
	},
	{
		node: 'printed',
		from: ['hub'],
		title: 'The update goes up on paper',
		text: 'The hub posts the update using shared ANT symbols, so anyone can read it without a screen.'
	},
	{
		node: 'neighbours',
		from: ['printed'],
		title: 'Neighbours pass it on',
		text: 'People who read the sign tell the neighbours on their street, and the update keeps travelling.'
	},
	{
		node: 'wayfinding',
		from: ['hub'],
		title: 'Signs show the way',
		text: 'Symbols in public space point everyone to the hub and to the meeting point.'
	},
	{
		node: 'meeting',
		from: ['neighbours', 'wayfinding'],
		title: 'Everyone meets',
		text: 'Residents gather at the agreed meeting point, where volunteers share what is known, in person.'
	}
];

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
