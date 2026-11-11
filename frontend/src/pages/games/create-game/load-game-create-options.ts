import axios from 'axios';

type GameCreateOptions = {
    game_name: string;
    game_date: string;
    game_number: number;
    default_min_buy_in: number;
    default_max_buy_in: number;
};

export async function loadGameCreateOptions(): Promise<GameCreateOptions> {
    const response = await axios.get<GameCreateOptions>('/api/v1/games/create-options');

    // Give the screen the JSON body so it can decide what to display.
    return response.data;
}
