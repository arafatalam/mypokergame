import axios from 'axios';

export async function updateUserPassword(
    userId: number,
    password: string,
    passwordConfirmation: string,
): Promise<void> {
    // Prepare the security cookie before sending the password update.
    await axios.get('/sanctum/csrf-cookie');
    await axios.patch('/api/v1/users/' + userId + '/password', {
        password: password,
        password_confirmation: passwordConfirmation,
    });
}