import axios from 'axios';

export type UserProfile = {
    id: number;
    username: string;
    first_name: string;
    last_name: string;
    email: string;
    phone: string | null;
    photo_url: string;
    can_change_photo: boolean;
    can_change_password: boolean;
    can_view_game_history?: boolean;
    can_view_payment_history?: boolean;
    has_uploaded_photo: boolean;
};

export async function loadUserProfile(id: number, signal: AbortSignal): Promise<UserProfile> {
    // Let the screen cancel the request when the selected account changes.
    const response = await axios.get<UserProfile>('/api/v1/users/' + id, {
        signal: signal,
    });

    return response.data;
}
