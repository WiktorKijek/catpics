import type { Generated } from "kysely";

export interface UsersTable {
	userId: string;
	userUsername: string;
	userIsAdmin: Generated<number>;
}

export interface LoginsTable {
	loginUserId: string;
	loginPasswordHash: string;
}

export interface SessionsTable {
	sessionId: string;
	sessionSecretHash: string;
	sessionCreatedAt: number;
	sessionUserId: string;
}

export interface PostsTable {
	postId: string;
	postAuthorId: string;
	postCaption: string | null;
	postLocation: string | null;
	postCreatedAt: number;
}

export interface PostImagesTable {
	postImageId: string;
	postImagePostId: string;
	postImageKey: string;
	postImagePosition: number;
}

export interface LikesTable {
	likePostId: string;
	likeUserId: string;
	likeCreatedAt: number;
}

export interface BookmarksTable {
	bookmarkPostId: string;
	bookmarkUserId: string;
	bookmarkCreatedAt: number;
}

export interface FollowsTable {
	followFollowerId: string;
	followFollowingId: string;
	followCreatedAt: number;
}

export interface CommentsTable {
	commentId: string;
	commentPostId: string;
	commentAuthorId: string;
	commentText: string;
	commentCreatedAt: number;
}

export interface ProfilesTable {
	profileUserId: string;
	profileAvatarKey: string | null;
	profileBio: string | null;
}

export interface PostStreaksTable {
	postStreakUserId: string;
	postStreakCurrent: Generated<number>;
	postStreakLongest: Generated<number>;
	postStreakLastDate: string | null;
}

export interface DB {
	users: UsersTable;
	logins: LoginsTable;
	sessions: SessionsTable;
	posts: PostsTable;
	postImages: PostImagesTable;
	likes: LikesTable;
	bookmarks: BookmarksTable;
	follows: FollowsTable;
	comments: CommentsTable;
	profiles: ProfilesTable;
	postStreaks: PostStreaksTable;
}
