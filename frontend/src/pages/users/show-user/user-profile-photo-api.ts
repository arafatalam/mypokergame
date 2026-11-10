import axios from 'axios';

export type SavedPhoto = {
    photo_url: string;
    has_uploaded_photo: boolean;
};

export async function saveUserProfilePhoto(userId: number, photo: File): Promise<SavedPhoto> {
    const formData = new FormData();
    formData.append('photo', photo);

    // Prepare the session's CSRF cookie before sending the protected upload.
    await axios.get('/sanctum/csrf-cookie');
    const response = await axios.post<SavedPhoto>('/api/v1/users/' + userId + '/photo', formData);

    return response.data;
}

export async function removeUserProfilePhoto(userId: number): Promise<SavedPhoto> {
    await axios.get('/sanctum/csrf-cookie');
    const response = await axios.delete<SavedPhoto>('/api/v1/users/' + userId + '/photo');

    return response.data;
}
