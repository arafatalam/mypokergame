import axios from 'axios';
import { useState } from 'react';
import samplePortrait from '../../../assets/casino/sample-account-portrait.png';
import TurquoisePaperTicket from '../../../components/turquoise-paper-ticket';
import useProfilePhoto from '../shared-resources/use-profile-photo';
import { removeUserProfilePhoto, saveUserProfilePhoto, type SavedPhoto } from './user-profile-photo-api';

type UserProfilePhotoTicketProps = {
    userId: number | undefined;
    profileName: string | number;
    photoUrl: string | undefined;
    canChangePhoto: boolean;
    hasUploadedPhoto: boolean;
};

export default function UserProfilePhotoTicket(props: UserProfilePhotoTicketProps) {
    const photo = useProfilePhoto();
    const [savedPhoto, setSavedPhoto] = useState<SavedPhoto | null>(null);
    const [pendingPhotoAction, setPendingPhotoAction] = useState('');
    const [saveFeedback, setSaveFeedback] = useState('');
    const arePhotoControlsLocked = !props.canChangePhoto || pendingPhotoAction !== '';
    const hasUploadedPhoto = savedPhoto?.has_uploaded_photo ?? props.hasUploadedPhoto;
    // Discard an unsaved preview before acting on the portrait stored on the server.
    const isRemoveDisabled = arePhotoControlsLocked || !hasUploadedPhoto || photo.photo !== null || photo.isCheckingPhoto;
    let portraitUrl = savedPhoto?.photo_url ?? props.photoUrl ?? samplePortrait;
    let previewActions = null;

    function handleChoosePhoto() {
        setSaveFeedback('');
        photo.handleChoosePhotoClick();
    }

    function handleDiscardPhoto() {
        setSaveFeedback('');
        photo.handleClearPhotoClick();
    }

    async function handleSavePhoto() {
        if (props.userId === undefined || photo.photo === null || photo.isCheckingPhoto || arePhotoControlsLocked) {
            return;
        }

        setSaveFeedback('');
        setPendingPhotoAction('Saving photo…');

        try {
            const result = await saveUserProfilePhoto(props.userId, photo.photo);
            // Switch to the saved image before discarding the temporary preview.
            setSavedPhoto(result);
            photo.handleClearPhotoClick();
            setSaveFeedback('Photo saved.');
        } catch (error) {
            let message = 'Could not confirm the photo save. Your preview is still here.';
            if (axios.isAxiosError<{ errors?: { photo?: string[] } }>(error) && error.response?.status === 422) {
                message = error.response.data.errors?.photo?.join(' ') || message;
            }
            setSaveFeedback(message);
        } finally {
            setPendingPhotoAction('');
        }
    }

    async function handleRemovePhoto() {
        if (props.userId === undefined || isRemoveDisabled) {
            return;
        }

        setSaveFeedback('');
        setPendingPhotoAction('Removing photo…');

        try {
            const result = await removeUserProfilePhoto(props.userId);
            // Laravel chooses the avatar once and returns the saved portrait.
            setSavedPhoto(result);
            setSaveFeedback('Photo removed.');
        } catch {
            setSaveFeedback('Could not confirm photo removal. Reopen the profile to check the saved portrait.');
        } finally {
            setPendingPhotoAction('');
        }
    }

    // Keep showing the saved portrait until the shared hook accepts a replacement.
    if (props.canChangePhoto && photo.photo !== null) {
        portraitUrl = photo.photoPreview;
        previewActions = (
            <>
                <p>Photo preview. Changes are unsaved.</p>
                <button type="button" disabled={arePhotoControlsLocked || photo.isCheckingPhoto} onClick={handleSavePhoto} className="show-user-photo-action w-full rounded-full px-3 py-2">
                    Save photo
                </button>
                <button type="button" disabled={arePhotoControlsLocked} onClick={handleDiscardPhoto} className="show-user-photo-action w-full rounded-full px-3 py-2">
                    Discard preview
                </button>
            </>
        );
    }

    let photoFeedback = photo.photoMessage;
    if (photo.isCheckingPhoto) {
        photoFeedback = 'Preparing photo…';
    }
    if (pendingPhotoAction !== '') {
        photoFeedback = pendingPhotoAction;
    }

    return (
        <TurquoisePaperTicket>
            <div className="grid justify-items-center gap-3 text-center">
                <div className="grid justify-items-center">
                    <img
                        src={portraitUrl}
                        alt="Profile portrait"
                        className="show-user-portrait aspect-square w-full max-w-44 rounded-full object-cover"
                    />
                    <h2 className="show-user-name casino-heading relative -mt-3 rounded-lg px-8 py-1 text-2xl uppercase">
                        {props.profileName}
                    </h2>
                </div>
                <input
                    ref={photo.photoInputRef}
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    disabled={arePhotoControlsLocked}
                    onChange={photo.handlePhotoChange}
                    hidden
                />
                <button
                    type="button"
                    disabled={arePhotoControlsLocked}
                    onClick={handleChoosePhoto}
                    className="show-user-photo-action w-full rounded-full px-3 py-2"
                >
                    Change photo
                </button>
                <button type="button" disabled={isRemoveDisabled} onClick={handleRemovePhoto} className="show-user-photo-action w-full rounded-full px-3 py-2">
                    Remove photo
                </button>
                <p hidden={photoFeedback === ''}>{photoFeedback}</p>
                <p hidden={saveFeedback === ''}>{saveFeedback}</p>
                {previewActions}
            </div>
        </TurquoisePaperTicket>
    );
}
