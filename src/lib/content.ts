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

export type NodeId = 'you' | 'blob' | 'booklet' | 'private' | 'board' | 'marks' | 'far';

/** The parts of the network, drawn as blobs in the story scene. */
export const networkNodes: { id: NodeId; label: string }[] = [
	{ id: 'you', label: 'You' },
	{ id: 'blob', label: 'Local Blob' },
	{ id: 'booklet', label: 'Public booklet' },
	{ id: 'private', label: 'Private profile' },
	{ id: 'board', label: 'Symbol board' },
	{ id: 'marks', label: 'Marked places' },
	{ id: 'far', label: 'Another Blob' }
];

/**
 * Illustrative example: one resident joining the network through a local Blob.
 * Each step lights up a node and grows a connection from the `from` nodes.
 */
export const story: { node: NodeId; from: NodeId[]; title: string; text: string }[] = [
	{
		node: 'you',
		from: [],
		title: 'Make your paper profile',
		text: 'With the Blackout Communication Kit you fill in a profile on paper: pictures, stories and interests, added with interest-token stickers or written by hand.'
	},
	{
		node: 'blob',
		from: ['you'],
		title: 'Hand it in at a nearby Blob',
		text: 'A Blob is a local point run by volunteer operators. When you submit your profile there, you choose whether it is public or private.'
	},
	{
		node: 'booklet',
		from: ['blob'],
		title: 'Public: anyone can browse',
		text: 'Public profiles go into the Blob’s booklet. Neighbours leaf through it, find shared interests and experiences, and get to know you, much like social media, but on paper.'
	},
	{
		node: 'private',
		from: ['blob'],
		title: 'Private: browse on request',
		text: 'Others still see your name and profile picture. To read more, they leave a request with the Blob operators, who pass it on the next time you visit. You decide.'
	},
	{
		node: 'board',
		from: ['blob'],
		title: 'Add a symbol of your own',
		text: 'Design a symbol, explain it on a form and hand both in at the Blob. The operators put it on the public board so everyone can learn it.'
	},
	{
		node: 'marks',
		from: ['board'],
		title: 'Symbols mark the neighbourhood',
		text: 'Once people know it, your symbol can mark events, places or anything else your community wants to point out.'
	},
	{
		node: 'far',
		from: ['blob'],
		title: 'Blobs reach further',
		text: 'Copies of your profile can be kept at other Blobs, so you can meet people who live further away. When there is electricity, Blobs can also send data to each other as light through fibre-optic cable.'
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
		example: 'Hand in your profile at a Blob and meet a neighbour with a shared interest.'
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
		title: 'Blob Signage',
		form: 'Folded signs',
		description: 'Printed signs that clearly label the places where information is shared.',
		example: 'Put up a sign so everyone can find the local Blob.'
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
		text: 'A blank map to mark your local Blob, meeting point and information points.',
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
