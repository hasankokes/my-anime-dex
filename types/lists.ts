export interface List {
    id: string;
    user_id: string;
    title: string;
    description: string | null;
    is_public: boolean;
    likes_count: number;
    created_at: string;
    updated_at: string;

    // Optional: Joined user data if needed
    profiles?: {
        username: string;
        avatar_url: string;
    };
}

export interface ListItem {
    id: string;
    list_id: string;
    anime_id: string;
    anime_title: string;
    anime_image: string;
    added_at: string;

    // Optional: details from API if we fetch fresh data
    score?: number;

    // User content
    user_score?: number;
    user_comment?: string | null;
    position: number;
}
