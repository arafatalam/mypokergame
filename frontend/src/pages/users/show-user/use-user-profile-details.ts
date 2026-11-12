import axios from 'axios';
import { useState, type ChangeEvent } from 'react';

import { formatPhoneNumber } from '../create-user/format-phone-number';
import type { UserProfile } from './load-user-profile';

type ProfileDetailsField = 'first_name' | 'last_name' | 'email' | 'phone';

export type ProfileDetailsErrors = Partial<Record<ProfileDetailsField, string[]>>;

export default function useUserProfileDetails(
    profile: UserProfile | null,
    onProfileSaved: (profile: UserProfile) => void,
) {
    const [isEditingDetails, setIsEditingDetails] = useState(false);
    const [isSavingDetails, setIsSavingDetails] = useState(false);
    const [saveMessage, setSaveMessage] = useState('');
    const [fieldErrors, setFieldErrors] = useState<ProfileDetailsErrors>({});

    // Keep what the user types separate from the profile Laravel last returned.
    const [firstNameDraft, setFirstNameDraft] = useState('');
    const [lastNameDraft, setLastNameDraft] = useState('');
    const [emailDraft, setEmailDraft] = useState('');
    const [phoneDraft, setPhoneDraft] = useState('');

    function handleEditDetails() {
        if (profile === null || isEditingDetails) {
            return;
        }

        // Copy the saved details before opening the inputs for editing.
        setFirstNameDraft(profile.first_name);
        setLastNameDraft(profile.last_name);
        setEmailDraft(profile.email);
        setPhoneDraft(profile.phone ?? '');
        setIsEditingDetails(true);
    }

    async function handleSaveDetails() {
        // Only start a save when a profile is loaded and no save is underway.
        if (profile === null || isSavingDetails) {
            return;
        }

        // Take a copy of the current drafts using the field names Laravel expects.
        const details = {
            first_name: firstNameDraft,
            last_name: lastNameDraft,
            email: emailDraft,
            phone: phoneDraft,
        };

        // Clear any message left by the previous save.
        setSaveMessage('');
        setFieldErrors({});
        // Lock the draft and Save button until Laravel responds.
        setIsSavingDetails(true);

        try {
            const response = await axios.patch<UserProfile>('/api/v1/users/' + profile.id, details);
            // Use Laravel's saved profile, including the username it chose.
            onProfileSaved(response.data);
            setIsEditingDetails(false);
        } catch (error) {
            if (axios.isAxiosError<{ errors?: ProfileDetailsErrors }>(error) && error.response?.status === 422) {
                const errors = error.response.data.errors;

                if (errors) {
                    // Laravel names these errors after the fields sent in the PATCH.
                    setFieldErrors(errors);
                    return;
                }
            }

            // Keep the drafts open if the save fails.
            console.error('Could not save the account details.', error);
            setSaveMessage('Could not confirm the save. Your edits are still here.');
        } finally {
            // Release the save lock so a failed draft can be edited and retried.
            setIsSavingDetails(false);
        }
    }

    function handleFirstNameChange(event: ChangeEvent<HTMLInputElement>) {
        setFirstNameDraft(event.currentTarget.value);
    }

    function handleLastNameChange(event: ChangeEvent<HTMLInputElement>) {
        setLastNameDraft(event.currentTarget.value);
    }

    function handleEmailChange(event: ChangeEvent<HTMLInputElement>) {
        setEmailDraft(event.currentTarget.value);
    }

    function handlePhoneChange(event: ChangeEvent<HTMLInputElement>) {
        setPhoneDraft(formatPhoneNumber(event.currentTarget.value));
    }

    // Keep the inputs read-only during Save so later keystrokes cannot be lost.
    const areDetailsReadOnly = !isEditingDetails || isSavingDetails || profile === null;
    let firstNameValue = profile?.first_name ?? '';
    let lastNameValue = profile?.last_name ?? '';
    let emailValue = profile?.email ?? '';
    let phoneValue = profile?.phone ?? '';

    if (isEditingDetails && profile !== null) {
        firstNameValue = firstNameDraft;
        lastNameValue = lastNameDraft;
        emailValue = emailDraft;
        phoneValue = phoneDraft;
    }

    let detailsButtonLabel = 'Edit';
    let detailsButtonHandler = handleEditDetails;

    // In edit mode, the same button calls the save handler when clicked.
    if (isEditingDetails) {
        detailsButtonLabel = 'Save';
        detailsButtonHandler = handleSaveDetails;
    }

    // While the save is running, override the usual button label.
    if (isSavingDetails) {
        detailsButtonLabel = 'Saving…';
    }

    return {
        saveMessage,
        fieldErrors,
        areDetailsReadOnly,
        firstNameValue,
        handleFirstNameChange,
        lastNameValue,
        handleLastNameChange,
        emailValue,
        handleEmailChange,
        phoneValue,
        handlePhoneChange,
        detailsButtonHandler,
        detailsButtonLabel,
        isDetailsButtonDisabled: profile === null || isSavingDetails,
    };
}
