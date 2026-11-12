import axios from 'axios';
import type { RoleOption } from '../shared-resources/role-option';

export type UserListItem = {
    id: number;
    first_name: string;
    last_name: string;
    phone: string | null;
    photo_url: string;
    role: {
        value: string;
        label: string;
    };
};

type UserListResponse = {
    data: UserListItem[];
    role_options: RoleOption[];
    meta: {
        current_page: number;
        last_page: number;
        total: number;
        from: number | null;
        to: number | null;
    };

};

export async function loadUsers(
    apiPath: string,
    page: number,
    role: string = 'all',
    search: string = '',
): Promise<UserListResponse> {

    const params: { page: number; role?: string; search?: string; } = { page: page };

    // Only send a role when the user chooses a specific one.
    if (role !== 'all') {
        params.role = role;
    }
    // Omit the search parameter when the field is blank.
    if (search.trim() !== '') {
        params.search = search.trim();
    }

    const response = await axios.get<UserListResponse>(apiPath, {
        params: params,
    });

    return response.data;
}

export type PlayerTabDetails = {
    player_since: string;
    balance: number;
    can_record_payment: boolean;
    last_payment: { amount: number; paid_at: string } | null;
    last_game: { game_name: string; game_date: string } | null;
};

export async function loadPlayerTab(userId: number, signal: AbortSignal): Promise<PlayerTabDetails> {
    const response = await axios.get<{ data: PlayerTabDetails }>('/api/v1/users/' + userId + '/player-tab', { signal });
    return response.data.data;
}
