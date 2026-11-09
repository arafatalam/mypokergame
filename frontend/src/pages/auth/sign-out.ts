import axios from 'axios'

export async function signOut(): Promise<void> {
    try {
        await axios.post('/api/v1/logout')
    } catch (error) {
        // A 401 means the session has already ended.
        if (!axios.isAxiosError(error) || error.response?.status !== 401) {
            throw error
        }
    }

    window.location.replace('/sign-in')
}
