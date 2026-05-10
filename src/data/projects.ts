export interface PortfolioProject {
	alt: string;
	title: string;
	timeframe: string;
	description: string;
	image: string;
	link: string;
	tech: string;
}

const projects: PortfolioProject[] = [
	{
		alt: 'neburose',
		title: 'Neburose',
		timeframe: 'May 2026 - Ongoing',
		description:
			'Owner of Neburose LLC, an organization building privacy-focused, accessible software.',
		image: '/project-icons/neburose.png',
		link: 'https://neburose.org',
		tech: 'Software organization'
	},
	{
		alt: 'kudosleague',
		title: 'Kudos League',
		timeframe: 'December 2024 - Ongoing',
		description:
			'Senior software engineer for a charity platform for organizing events, profiles, and sharing resources.',
		image: '/project-icons/kudosleague.png',
		link: 'https://kudosleague.org',
		tech: 'Full-stack web platform'
	},
	{
		alt: 'pv',
		title: 'Progressive Victory',
		timeframe: '2022 - 2024',
		description:
			'Lead developer of a political project dedicated to getting candidates elected in key races.',
		image: 'https://user-images.githubusercontent.com/11844002/230267579-abe1407a-4fdd-447e-a590-37011d2a8e2c.png',
		link: 'https://progress.win',
		tech: 'TypeScript, Full-stack web platform'
	},
	{
		alt: 'oooh',
		title: 'Oooh',
		description:
			'Maintained Discord bot, client services and core functionalities of website.',
		timeframe: '2021 - 2023',
		image: 'https://i.imgur.com/CiGAwE5.png',
		link: '#',
		tech: 'Node.js, Discord platform tooling'
	},
	{
		alt: 'smashcords',
		title: 'Smashcords',
		timeframe: '2018 - Ongoing',
		description:
			'Developer and owner for a website containing the central hub for all smash-related Discord servers.',
		image: 'https://i.imgur.com/WKUM61X.png',
		link: 'https://smashcords.com',
		tech: 'Community platform engineering'
	},
	{
		alt: 'discord.js',
		title: 'discord.js',
		description:
			'Past maintainer of discord.js, the biggest Discord bot library, written in Node.js.',
		timeframe: '2018 - 2019',
		image: '/djs.svg',
		link: 'https://discord.js.org',
		tech: 'Node.js library maintenance'
	}
];

export default projects;
