export interface PortfolioProject {
	alt: string;
	title: string;
	timeframe: string;
	description: string;
	image: string;
	link: string;
}

const projects: PortfolioProject[] = [
	{
		alt: 'constellations',
		title: 'Constellations',
		timeframe: '2026 - Ongoing',
		description:
			'Founder and lead developer of a symptom tracker and system workspace for dissociatives and multiples.',
		image: 'https://app.neburose.com/icons/icon-512.png',
		link: 'https://app.neburose.com'
	},
	{
		alt: 'kudosleague',
		title: 'Kudos League',
		timeframe: 'December 2024 - Ongoing',
		description:
			'Senior software engineer for a charity platform for organizing events, profiles, and sharing resources.',
		image: '/project-icons/kudosleague.png',
		link: 'https://kudosleague.org'
	},
	{
		alt: 'pv',
		title: 'Progressive Victory',
		timeframe: '2022 - 2024',
		description:
			'Lead developer of a political project dedicated to getting candidates elected in key races.',
		image: 'https://user-images.githubusercontent.com/11844002/230267579-abe1407a-4fdd-447e-a590-37011d2a8e2c.png',
		link: 'https://progress.win'
	},
	{
		alt: 'oooh',
		title: 'Oooh',
		description:
			'Maintained Discord bot, client services and core functionalities of website.',
		timeframe: '2021 - 2023',
		image: 'https://i.imgur.com/CiGAwE5.png',
		link: 'https://www.linkedin.com/company/oooh/posts/?feedView=all'
	},
	{
		alt: 'smashcords',
		title: 'Smashcords',
		timeframe: '2018 - Ongoing',
		description:
			'Developer and owner for a website containing the central hub for all smash-related Discord servers.',
		image: 'https://i.imgur.com/WKUM61X.png',
		link: 'https://smashcords.com'
	},
	{
		alt: 'discord.js',
		title: 'discord.js',
		description:
			'Past maintainer of discord.js, the biggest Discord bot library, written in Node.js.',
		timeframe: '2018 - 2019',
		image: '/djs.svg',
		link: 'https://discord.js.org'
	}
];

export default projects;
