export type FeedUser = {
	username: string;
	name: string;
	avatarUrl: string;
};

export type FeedComment = {
	id: string;
	username: string;
	text: string;
};

export type FeedPost = {
	id: string;
	user: FeedUser;
	location: string | null;
	imageUrl: string;
	caption: string;
	likeCount: number;
	commentCount: number;
	comments: FeedComment[];
	timeAgo: string;
};

export type FeedPage = {
	posts: FeedPost[];
	nextCursor: number | null;
};

const USERNAMES = [
	"whisker.wanderer",
	"mittens.the.cat",
	"purrfect_paws",
	"the_cat_whisperer",
	"kitty_katniss",
	"luna_lapcat",
	"sir_meowsalot",
	"chonky.boy",
	"catnip.addict",
	"tabby_tales",
	"ginger.ninja",
	"smol.bean",
	"paw.sitive",
	"felinetastic",
	"meow_meow",
	"hiss_and_pieces",
	"clawdia",
	"feline.fine",
	"floofy.friends",
	"knead.to.know",
];

const LOCATIONS = [
	"Warsaw, Poland",
	"Berlin, Germany",
	"Paris, France",
	"Kyoto, Japan",
	"Portland, OR",
	"Amsterdam, Netherlands",
	"Lisbon, Portugal",
	"Barcelona, Spain",
	"London, UK",
	"New York, NY",
	"Seoul, South Korea",
	"Sydney, Australia",
];

const CAPTIONS = [
	"No thoughts, just vibes. And a bit of catnip. #catsofinstagram",
	"Discovered the warm spot on the keyboard. It's mine now. #caturday",
	"Judging you from the windowsill. You're welcome. #catlife",
	"Box inspection passed with flying colors. 10/10 would sit again.",
	"Took a nap in 14 positions today. Productivity is for dogs.",
	"The loaf is fresh, the loaf is warm. #catloaf",
	"Chased my tail for 20 minutes. Would do it again.",
	"Whiskers sharp, attitude sharper. #felinefine",
	"Belly rubs: attempted. Fingers: in danger. #nobellyzone",
	"Perfectly balanced, as all cat things should be.",
	"Today's agenda: nap, snack, judge neighbors, nap again.",
	"You may pet me now. I'll allow it. Once. #blessed",
	"The sunbeam has been claimed. All hail the sunbeam.",
	"Auditioned for the villain arc of the neighborhood birds. Got the part.",
	"Breakfast, lunch, dinner, and a suspicious fourth meal.",
	"Testing gravity, one fallen glass at a time.",
];

const COMMENT_TEXTS = [
	"sooo cute 😻",
	"that pose is everything",
	"gorgeous floof!!",
	"look at those eyes 🥺",
	"absolutely purrfect",
	"needed this today",
	"the ear tufts 😭",
	"can I get a smooch?",
	"10/10 would boop",
	"living for this content",
	"this made my day",
	"cat of the year, no contest",
];

const PAGE_SIZE = 5;
const MAX_COMMENTS_PER_POST = 3;

function mulberry32(seed: number): () => number {
	let a = seed >>> 0;
	return () => {
		a = (a + 0x6d2b79f5) >>> 0;
		let t = a;
		t = Math.imul(t ^ (t >>> 15), t | 1);
		t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
		return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
	};
}

function pick<T>(rand: () => number, items: T[]): T {
	return items[Math.floor(rand() * items.length)];
}

function formatLikes(n: number): string {
	if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
	if (n >= 1_000) return `${(n / 1_000).toFixed(1)}k`;
	return String(n);
}

function formatTimeAgo(index: number): string {
	const minutes = (index * 37 + 3) % 480;
	if (minutes < 60) return `${minutes} minutes ago`;
	const hours = Math.floor(minutes / 60);
	if (hours < 24) return `${hours} hours ago`;
	return `${Math.floor(hours / 24)} days ago`;
}

function createPost(index: number): FeedPost {
	const rand = mulberry32(index * 2654435761 + 17);
	const username = pick(rand, USERNAMES);
	const location = rand() < 0.8 ? pick(rand, LOCATIONS) : null;
	const commentCount = 3 + Math.floor(rand() * 200);
	const comments = Array.from(
		{ length: 1 + Math.floor(rand() * MAX_COMMENTS_PER_POST) },
		(_, i) => ({
			id: `${index}-c${i}`,
			username: pick(rand, USERNAMES),
			text: pick(rand, COMMENT_TEXTS),
		}),
	);

	return {
		id: `post-${index}`,
		user: {
			username,
			name: username.replace(/[._-]/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()),
			avatarUrl: `https://picsum.photos/seed/avatar-${username}/100/100`,
		},
		location,
		imageUrl: `https://picsum.photos/seed/catpic-${index}/1080/1350`,
		caption: pick(rand, CAPTIONS),
		likeCount: 800 + Math.floor(rand() * 120_000),
		commentCount,
		comments,
		timeAgo: formatTimeAgo(index),
	};
}

export async function fetchFeedPage(pageParam: number): Promise<FeedPage> {
	const delay = 350 + Math.random() * 400;
	await new Promise((resolve) => setTimeout(resolve, delay));

	return {
		posts: Array.from({ length: PAGE_SIZE }, (_, i) => createPost(pageParam * PAGE_SIZE + i)),
		nextCursor: pageParam + 1,
	};
}

export { formatLikes };
