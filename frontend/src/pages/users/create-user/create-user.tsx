import CasinoTicket from '../../../components/casino-ticket';
import dealerArtwork from '../../../assets/casino/create-user-dealer-quote.png';
import registrationSign from '../../../assets/casino/create-user-registration-sign.png';
import ProfilePhotoField from './profile-photo-field';
import EntryTicket from './entry-ticket';
import ConfirmationTicket from '../../../components/confirmation-ticket';
import CreateUserErrorTicket from './create-user-error-ticket';
import '../../../components/player-tab.css';
import './create-user.css';
import { useEffect, useState } from 'react';
import { formatPhoneNumber } from './format-phone-number';
import axios from 'axios';
import { buildRoleOptions } from '../shared-resources/build-role-options';
import type { RoleOption } from '../shared-resources/role-option';
import type { ChangeEvent, SubmitEvent } from 'react';
import useCreateUserSubmission from './use-create-user-submission';

type CreateUserProps = {
    onOpenUserList: () => void;
};

function CreateUser(props: CreateUserProps) {
    const submission = useCreateUserSubmission();
    const isAccountCreated = submission.createdAccount !== null;
    // Keep Role and photo locked until Create another clears the Entry Ticket.
    const isCreationLocked = submission.isSubmitting || isAccountCreated;

    // Give each field its own value so editing one field leaves the others alone.
    const [firstName, setFirstName] = useState('');
    const [lastName, setLastName] = useState('');
    const [email, setEmail] = useState('');
    const [phone, setPhone] = useState('');

    const [roleOptions, setRoleOptions] = useState<RoleOption[]>([]);
    const [selectedRole, setSelectedRole] = useState('player');
    const [isLoadingRoles, setIsLoadingRoles] = useState(true);

    const [photo, setPhoto] = useState<File | null>(null);
    const [isCheckingPhoto, setIsCheckingPhoto] = useState(false);
    const [isConfirmationOpen, setIsConfirmationOpen] = useState(false);
    const [photoFieldKey, setPhotoFieldKey] = useState(0);

    function handleFirstNameChange(event: ChangeEvent<HTMLInputElement>) {
        setFirstName(event.currentTarget.value);
        submission.clearFeedbackAfterEdit('first_name');
    }

    function handleLastNameChange(event: ChangeEvent<HTMLInputElement>) {
        setLastName(event.currentTarget.value);
        submission.clearFeedbackAfterEdit('last_name');
    }

    function handleEmailChange(event: ChangeEvent<HTMLInputElement>) {
        setEmail(event.currentTarget.value);
        submission.clearFeedbackAfterEdit('email');
    }

    function handlePhoneChange(event: ChangeEvent<HTMLInputElement>) {
        const formattedPhone = formatPhoneNumber(event.currentTarget.value);
        setPhone(formattedPhone);
        submission.clearFeedbackAfterEdit('phone');
    }

    function handleRoleChange(event: ChangeEvent<HTMLSelectElement>) {
        setSelectedRole(event.currentTarget.value);
        submission.clearFeedbackAfterEdit('role');
    }

    function handlePhotoChange(selectedPhoto: File | null) {
        setPhoto(selectedPhoto);
        submission.clearFeedbackAfterEdit('photo');
    }

    let roleLoadingMessage = '';

    if (isLoadingRoles) {
        roleLoadingMessage = 'Loading roles…';
    }

    useEffect(function () {
        let ignoreResult = false;

        async function loadRoles() {
            try {
                const response = await axios.get<{ roles: RoleOption[]; }>(
                    '/api/v1/users/create-options'
                );

                if (ignoreResult) {
                    return;
                }

                setRoleOptions(response.data.roles);
            } catch (error) {
                if (ignoreResult) {
                    return;
                }

                console.error('Could not load roles.', error);
            } finally {
                // Only the active effect can finish loading.
                if (!ignoreResult) {
                    setIsLoadingRoles(false);
                }
            }
        }

        void loadRoles();

        // Mark this run's request as old when React cleans up the effect.
        return function cleanup() {
            ignoreResult = true;
        };
    }, []);

    const isBlocked = isCheckingPhoto || isLoadingRoles || roleOptions.length === 0;
    const isSubmitDisabled = isBlocked || isCreationLocked;

    function handleSubmit(event: SubmitEvent<HTMLFormElement>) {
        event.preventDefault();

        // Submitting through the form must respect the same lock as clicking the button.
        if (isSubmitDisabled) {
            return;
        }

        setIsConfirmationOpen(true);
    }

    function handleCancelConfirmation() {
        setIsConfirmationOpen(false);
    }

    async function handleConfirmCreation() {
        // Only the confirmation button starts the request.
        setIsConfirmationOpen(false);
        await submission.submitAccount({
            firstName,
            lastName,
            email,
            phone,
            selectedRole,
            photo,
        }, isSubmitDisabled);
    }

    async function handleCopyCredentials() {
        const account = submission.createdAccount;

        if (account === null) {
            return;
        }

        const credentials =
            'Username: ' + account.username + '\n' +
            'Temporary password: ' + account.generated_password;

        try {
            await navigator.clipboard.writeText(credentials);
        } catch {
            window.alert('Could not copy the credentials. You can copy them from the Entry Ticket.');
        }
    }

    function handleCreateAnother() {
        setFirstName('');
        setLastName('');
        setEmail('');
        setPhone('');
        setSelectedRole('player');
        setPhoto(null);
        setIsCheckingPhoto(false);

        // Start with a fresh photo picker so its preview clears too.
        setPhotoFieldKey(photoFieldKey + 1);
        submission.clearSubmissionFeedback();
    }

    let entryActions = null;

    // Show these actions once Laravel has created the account.
    if (submission.createdAccount !== null) {
        entryActions = (
            <div className="create-user-entry-actions">
                <button type="button" onClick={handleCopyCredentials} className="casino-heading create-user-entry-action">
                    <span>Copy to clipboard</span>
                </button>
                <button type="button" onClick={handleCreateAnother} className="casino-heading create-user-entry-action">
                    <span>Create another</span>
                </button>
                <button
                    type="button"
                    onClick={props.onOpenUserList}
                    className="casino-heading create-user-entry-action create-user-entry-action-list"
                >
                    <span>Go to User List</span>
                </button>
            </div>
        );
    }

    return (
        <div className="create-user-tickets relative mx-auto grid w-full max-w-[800px] items-start gap-4 md:grid-cols-[2fr_1fr] md:items-stretch">
            {/* Keep validation feedback above the registration artwork on wide screens. */}
            <div className="create-user-left-margin">
                <CreateUserErrorTicket fieldErrors={submission.fieldErrors} />
                <img src={registrationSign} alt="New Players & Staff" width={960} height={605} className="create-user-margin-art create-user-registration-sign" />
            </div>
            <img src={dealerArtwork} alt="I deal the cards. You deal with your face." width={960} height={640} className="create-user-margin-art create-user-dealer" />

            <div className="grid min-w-0 gap-4 md:col-start-2 md:row-start-1 md:content-between">
                {/* Entry credentials and success actions */}
                <div className="create-user-entry-slot">
                    <EntryTicket account={submission.createdAccount} />
                    {entryActions}
                </div>

                <ProfilePhotoField
                    key={photoFieldKey}
                    onPhotoChange={handlePhotoChange}
                    onPhotoCheckingChange={setIsCheckingPhoto}
                    isLocked={isCreationLocked}
                />
            </div>

            {/* Form ticket */}
            <CasinoTicket compactEdges className="create-user-form-ticket min-w-0 p-6 md:col-start-1 md:row-start-1">
                <form onSubmit={handleSubmit} className="create-user-form grid gap-3 sm:px-3">
                    <h2 className="casino-heading casino-title-band px-2 py-3 text-center text-3xl uppercase">Create User</h2>

                    {/* Account details */}
                    <div className="grid gap-1">
                        <label htmlFor="preview-first-name">First name *</label>
                        <input
                            id="preview-first-name"
                            name="first_name"
                            type="text"
                            maxLength={100}
                            autoComplete="off"
                            value={firstName}
                            onChange={handleFirstNameChange}
                            readOnly={isAccountCreated}
                            disabled={submission.isSubmitting}
                            className="casino-input" />
                    </div>
                    <div className="grid gap-1">
                        <label htmlFor="preview-last-name">Last name *</label>
                        <input
                            id="preview-last-name"
                            name="last_name"
                            type="text"
                            maxLength={100}
                            autoComplete="off"
                            value={lastName}
                            onChange={handleLastNameChange}
                            readOnly={isAccountCreated}
                            disabled={submission.isSubmitting}
                            className="casino-input" />
                    </div>
                    <div className="grid gap-1">
                        <label htmlFor="preview-email">Email *</label>
                        <input
                            id="preview-email"
                            name="email"
                            type="email"
                            maxLength={254}
                            autoComplete="off"
                            value={email}
                            onChange={handleEmailChange}
                            readOnly={isAccountCreated}
                            disabled={submission.isSubmitting}
                            className="casino-input" />
                    </div>
                    <div className="grid gap-1">
                        <label htmlFor="preview-phone">Phone (optional)</label>
                        <input
                            id="preview-phone"
                            name="phone"
                            type="tel"
                            autoComplete="off"
                            value={phone}
                            onChange={handlePhoneChange}
                            readOnly={isAccountCreated}
                            disabled={submission.isSubmitting}
                            className="casino-input" />
                    </div>
                    <div className="grid gap-1">
                        <label htmlFor="preview-role">Role *</label>
                        <select
                            id="preview-role"
                            name="role"
                            value={selectedRole}
                            onChange={handleRoleChange}
                            disabled={isLoadingRoles || isCreationLocked}
                            className="casino-select w-full min-w-0"
                        >
                            {buildRoleOptions(roleOptions)}
                        </select>
                        <p className="text-sm">{roleLoadingMessage}</p>
                    </div>

                    {/* Submit the account and show request feedback. */}
                    <button
                        type="submit"
                        disabled={isSubmitDisabled}
                        className="casino-button casino-heading mx-auto mt-2 min-h-11 rounded-full px-6 py-2 text-xl uppercase"
                    >
                        Create User
                    </button>
                    <p className="text-center text-sm">{submission.submitMessage}</p>
                </form>
            </CasinoTicket>

            <ConfirmationTicket
                isOpen={isConfirmationOpen}
                title="Confirm User Creation"
                message="Create this user account?"
                confirmLabel="Create User"
                onCancel={handleCancelConfirmation}
                onConfirm={handleConfirmCreation}
            />
        </div>
    );
}

export default CreateUser;
