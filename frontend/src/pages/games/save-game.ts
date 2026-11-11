import axios from 'axios';

type SaveGameDetails = {
    game_name: string;
    use_custom_limits: boolean;
    min_buy_in: number;
    max_buy_in: number;
};

type SavedGame = {
    id: number;
    game_name: string;
};

export async function saveGame(details: SaveGameDetails): Promise<SavedGame> {
    // Prepare the CSRF cookie before the session-authenticated write.
    await axios.get('/sanctum/csrf-cookie');
    const response = await axios.post<SavedGame>('/api/v1/games', details);

    return response.data;
}
