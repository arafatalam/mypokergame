import CasinoTicket from '../../../components/casino-ticket'
import dealerArtwork from '../../../assets/casino/create-user-dealer-quote.png'
import registrationSign from '../../../assets/casino/create-user-registration-sign.png'
import ProfilePhotoField from './profile-photo-field'
import EntryTicket from './entry-ticket'
import CreateUserConfirmationTicket from './create-user-confirmation-ticket'
import CreateUserErrorTicket from './create-user-error-ticket'
import '../../../components/player-tab.css'
import './create-user.css'
import { useEffect, useState } from 'react'
import { formatPhoneNumber } from './format-phone-number'
import axios from 'axios'
import { buildRoleOptions } from '../shared-resources/build-role-options'
import type { RoleOption } from '../shared-resources/role-option'
import type { ChangeEvent, SubmitEvent } from 'react'
import useCreateUserSubmission from './use-create-user-submission'

function CreateUser() {
    const submission = useCreateUserSubmission()

    // Give each field its own value so editing one field leaves the others alone.
    const [firstName, setFirstName] = useState('');
    const [lastName, setLastName] = useState('');
    const [email, setEmail] = useState('');
    const [phone, setPhone] = useState('');

    const [roleOptions, setRoleOptions] = useState<RoleOption[]>([]);
    const [selectedRole, setSelectedRole] = useState('player');
    const [isLoadingRoles, setIsLoadingRoles] = useState(true);

    const [photo, setPhoto] = useState<File | null>(null)
    const [isCheckingPhoto, setIsCheckingPhoto] = useState(false)
    const [isConfirmationOpen, setIsConfirmationOpen] = useState(false)

    function handleFirstNameChange(event: ChangeEvent<HTMLInputElement>) {
        setFirstName(event.currentTarget.value)
        submission.clearFeedbackAfterEdit('first_name')
    }

    function handleLastNameChange(event: ChangeEvent<HTMLInputElement>) {
        setLastName(event.currentTarget.value)
        submission.clearFeedbackAfterEdit('last_name')
    }

    function handleEmailChange(event: ChangeEvent<HTMLInputElement>) {
        setEmail(event.currentTarget.value)
        submission.clearFeedbackAfterEdit('email')
    }

    function handlePhoneChange(event: ChangeEvent<HTMLInputElement>) {
        const formattedPhone = formatPhoneNumber(event.currentTarget.value)
        setPhone(formattedPhone)
        submission.clearFeedbackAfterEdit('phone')
    }

    function handleRoleChange(event: ChangeEvent<HTMLSelectElement>) {
        setSelectedRole(event.currentTarget.value)
        submission.clearFeedbackAfterEdit('role')
    }

    function handlePhotoChange(selectedPhoto: File | null) {
        setPhoto(selectedPhoto)
        submission.clearFeedbackAfterEdit('photo')
    }

    let roleLoadingMessage = ''

    if (isLoadingRoles) {
        roleLoadingMessage = 'Loading roles…'
    }

    useEffect(function () {
        let ignoreResult = false

        async function loadRoles() {
            try {
                const response = await axios.get<{ roles: RoleOption[] }>(
                    '/api/v1/users/create-options'
                )

                if (ignoreResult) {
                    return
                }

                setRoleOptions(response.data.roles)
            } catch (error) {
                if (ignoreResult) {
                    return
                }

                console.error('Could not load roles.', error)
            } finally {
                // Only the active effect can finish loading.
                if (!ignoreResult) {
                    setIsLoadingRoles(false)
                }
            }
        }

        void loadRoles()

        // Mark this run's request as old when React cleans up the effect.
        return function cleanup() {
            ignoreResult = true
        }
    }, [])

    const isBlocked = isCheckingPhoto || isLoadingRoles || roleOptions.length === 0
    function handleSubmit(event: SubmitEvent<HTMLFormElement>) {
        event.preventDefault()

        if (isBlocked || submission.isSubmitting) {
            return
        }

        setIsConfirmationOpen(true)
    }

    function handleCancelConfirmation() {
        setIsConfirmationOpen(false)
    }

    async function handleConfirmCreation() {
        // Only the confirmation button starts the request.
        setIsConfirmationOpen(false)
        await submission.submitAccount({
            firstName,
            lastName,
            email,
            phone,
            selectedRole,
            photo,
        }, isBlocked)
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
                <EntryTicket account={submission.createdAccount} />

                <ProfilePhotoField
                    onPhotoChange={handlePhotoChange}
                    onPhotoCheckingChange={setIsCheckingPhoto}
                    isSubmitting={submission.isSubmitting}
                />
            </div>

            {/* Form ticket */}
            <CasinoTicket compactEdges className="create-user-form-ticket min-w-0 p-6 md:col-start-1 md:row-start-1">
                <form onSubmit={handleSubmit} className="create-user-form grid gap-3 sm:px-3">
                    <h2 className="casino-heading casino-title-band rounded-sm px-2 py-3 text-center text-3xl uppercase">Create User</h2>

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
                            disabled={isLoadingRoles || submission.isSubmitting}
                            className="casino-input casino-select"
                        >
                            {buildRoleOptions(roleOptions)}
                        </select>
                        <p className="text-sm">{roleLoadingMessage}</p>
                    </div>

                    {/* Submit the account and show request feedback. */}
                    <button
                        type="submit"
                        disabled={isBlocked || submission.isSubmitting}
                        className="casino-button casino-heading mx-auto mt-2 min-h-11 rounded-full px-6 py-2 text-xl uppercase"
                    >
                        Create User
                    </button>
                    <p className="text-center text-sm">{submission.submitMessage}</p>
                </form>
            </CasinoTicket>

            <CreateUserConfirmationTicket
                isOpen={isConfirmationOpen}
                onCancel={handleCancelConfirmation}
                onConfirm={handleConfirmCreation}
            />
        </div>
    )
}

export default CreateUser
