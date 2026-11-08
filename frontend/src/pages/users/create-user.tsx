import casinoLogo from '../../assets/casino/skanders-game-logo.png'
import CasinoTicket from '../../components/casino-ticket'
import useAssignableRoles from './use-assignable-roles'
import useProfilePhoto from './use-profile-photo'
import useCreateUserSubmission from './use-create-user-submission'
import { useState } from 'react'
import type { ChangeEvent, SubmitEvent } from 'react'

import './create-user.css'

function CreateUser() {
    // Keep each name and contact value while React updates the screen.
    const [firstName, setFirstName] = useState('')
    const [lastName, setLastName] = useState('')
    const [email, setEmail] = useState('')
    const [phone, setPhone] = useState('')
    const submission = useCreateUserSubmission()
    const roleChoices = useAssignableRoles()
    // Start each new form with Player selected.
    const [selectedRole, setSelectedRole] = useState('player')
    const { photoInputRef, ...profilePhoto } = useProfilePhoto(submission.clearSubmissionFeedback)

    function handleFirstNameChange(event: ChangeEvent<HTMLInputElement>) {
        submission.clearSubmissionFeedback()
        setFirstName(event.currentTarget.value)
    }

    function handleLastNameChange(event: ChangeEvent<HTMLInputElement>) {
        submission.clearSubmissionFeedback()
        setLastName(event.currentTarget.value)
    }

    function handleEmailChange(event: ChangeEvent<HTMLInputElement>) {
        submission.clearSubmissionFeedback()
        setEmail(event.currentTarget.value)
    }

    function handlePhoneChange(event: ChangeEvent<HTMLInputElement>) {
        submission.clearSubmissionFeedback()
        const text = event.currentTarget.value
        let localNumber = text

        // Remove our prefix so its 1 never becomes part of the local number.
        if (localNumber.startsWith('+1')) {
            localNumber = localNumber.slice(2)
        }

        const digits = localNumber.replace(/\D/g, '').slice(0, 10)

        // An optional phone must remain clearable.
        if (digits.length === 0) {
            setPhone('')
            return
        }

        let formatted = digits.slice(0, 3)

        // Add separators only when the next group has digits.
        if (digits.length > 3) {
            formatted = formatted + '-' + digits.slice(3, 6)
        }

        if (digits.length > 6) {
            formatted = formatted + '-' + digits.slice(6)
        }

        setPhone('+1 ' + formatted)
    }

    function handleRoleChange(event: ChangeEvent<HTMLSelectElement>) {
        submission.clearSubmissionFeedback()
        setSelectedRole(event.currentTarget.value)
    }

    let photoDescription = 'Illustrated sample portrait'

    if (profilePhoto.photo !== null) {
        photoDescription = 'Selected profile photo preview'
    }

    // Build one dropdown option for each permitted role.
    const roleOptions = []

    for (const role of roleChoices.roles) {
        roleOptions.push(
            <option key={role.value} value={role.value}>
                {role.label}
            </option>
        )
    }

    async function handleSubmit(event: SubmitEvent<HTMLFormElement>) {
        event.preventDefault()

        // Pass the current controlled values and photo/role readiness to the request.
        await submission.submitAccount({
            firstName,
            lastName,
            email,
            phone,
            selectedRole,
            photo: profilePhoto.photo,
        }, profilePhoto.isCheckingPhoto || roleChoices.isLoadingRoles || roleChoices.roles.length === 0)
    }

    // Show credentials only after Laravel confirms that the account was created.
    let accountResult = null

    if (submission.createdAccount !== null) {
        accountResult = (
            <section aria-labelledby="created-account-title" className="casino-title-band mt-4 rounded-sm px-3 py-3 text-center text-sm leading-relaxed">
                <h3 id="created-account-title" className="font-bold">Account created successfully.</h3>
                <p className="break-all">Username: <span className="select-all">{submission.createdAccount.username}</span></p>
                <p className="break-all">Generated password: <span className="select-all font-mono">{submission.createdAccount.generated_password}</span></p>
                <p className="mt-2 text-xs">Keep these credentials before editing this form, submitting again or leaving this screen. The generated password cannot be retrieved later.</p>
            </section>
        )
    }

    return (
        <div className="create-user-screen flex min-h-screen flex-col justify-center px-5 py-8 sm:px-8 sm:py-10">
            {/* Keep the existing brand and App-owned casino scenery. */}
            <h1>
                <img src={casinoLogo} alt="Skander’s Game" className="mx-auto mb-8 w-[265px] max-w-[65%]" />
            </h1>

            <div className="create-account-layout mx-auto flex w-full max-w-[800px] flex-col md:grid md:grid-cols-[180px_minmax(0,1fr)] md:items-center md:pl-4 lg:grid-cols-[225px_minmax(0,1fr)]">
                {/* Preview the same compressed photo that will be submitted. */}
                <CasinoTicket className="create-account-photo-ticket relative z-10 ml-4 w-[170px] px-5 py-5 md:ml-0 md:mt-9 md:w-full md:self-start">
                    <section aria-labelledby="account-photo-title">
                        <div aria-hidden="true" className="create-account-rank mb-3">K<br />♥</div>
                        <img src={profilePhoto.photoPreview} alt={photoDescription} className="create-account-portrait block w-full rounded-sm border border-[var(--vegas-ticket-line)] object-cover" />
                        <div aria-hidden="true" className="create-account-rank create-account-bottom-rank mt-3 rotate-180">K<br />♥</div>
                        <h2 id="account-photo-title" className="mt-4 mb-2 text-center text-sm">
                            Photo <span className="text-xs">(optional)</span>
                        </h2>
                        {/* The browser manages the file input; React remembers its chosen File. */}
                        <input disabled={submission.isSubmitting} ref={photoInputRef} type="file" accept="image/jpeg,image/png,image/webp" onChange={profilePhoto.handlePhotoChange} aria-label="Choose profile photo" aria-describedby="photo-help photo-message photo-error" aria-invalid={submission.fieldErrors.photo !== ''} hidden />
                        <button type="button" disabled={submission.isSubmitting} aria-describedby="photo-help photo-message photo-error" onClick={profilePhoto.handleChoosePhotoClick} className="casino-title-band min-h-11 w-full rounded-full border border-[var(--vegas-ticket-line)] px-2 py-2 text-sm">
                            Choose photo
                        </button>
                        {/* Keep clearing available during a check so Sam can cancel a pending choice. */}
                        <button type="button" onClick={profilePhoto.handleClearPhotoClick} disabled={submission.isSubmitting || (profilePhoto.photo === null && !profilePhoto.isCheckingPhoto)} className="mt-2 min-h-11 w-full rounded-full border border-[var(--vegas-ticket-line)] px-2 py-2 text-sm disabled:opacity-50">
                            Clear photo
                        </button>
                        <p id="photo-error" className="mt-2 text-center text-xs font-bold break-words">{submission.fieldErrors.photo}</p>
                        <p id="photo-help" className="mt-2 text-center text-xs">
                            JPG, PNG or WebP. Original photo up to 10 MB.
                        </p>
                        <p id="photo-message" role="status" aria-atomic="true" className="mt-2 text-center text-xs break-words">{profilePhoto.photoMessage}</p>
                    </section>
                </CasinoTicket>

                {/* Reuse the real ticket component for scallops, cut-outs and inset borders. */}
                <CasinoTicket className="create-account-form-ticket -mt-5 w-full px-6 pt-12 pb-7 md:mt-0 md:px-8 md:pt-7">
                    {/* Collect account details and handle submission through React. */}
                    <form aria-labelledby="create-account-title" onSubmit={handleSubmit}>
                        <h2 id="create-account-title" className="casino-heading casino-title-band create-account-title mt-2 rounded-sm px-2 py-3 text-center uppercase">
                            Create User
                        </h2>
                        <p className="mt-4 mb-1 text-xs">Fields marked <span aria-hidden="true">*</span> are required.</p>

                        {/* Keep names and contact details controlled by React. */}
                        <div className="create-account-field grid items-center gap-1 py-3 lg:grid-cols-[128px_minmax(0,1fr)] lg:gap-3">
                            <label htmlFor="first-name">First name <span aria-hidden="true">*</span></label>
                            <div className="min-w-0">
                                <input disabled={submission.isSubmitting} id="first-name" name="first_name" type="text" required maxLength={100} aria-invalid={submission.fieldErrors.first_name !== ''} aria-describedby="first-name-error" autoComplete="off" value={firstName} onChange={handleFirstNameChange} className="casino-input aria-invalid:outline-2 aria-invalid:outline-[var(--vegas-wine)] min-h-11 min-w-0 w-full rounded-lg border border-current px-3 py-2" />
                                <p id="first-name-error" className="text-xs font-bold break-words">{submission.fieldErrors.first_name}</p>
                            </div>
                        </div>
                        <div className="create-account-field grid items-center gap-1 py-3 lg:grid-cols-[128px_minmax(0,1fr)] lg:gap-3">
                            <label htmlFor="last-name">Last name <span aria-hidden="true">*</span></label>
                            <div className="min-w-0">
                                <input disabled={submission.isSubmitting} id="last-name" name="last_name" type="text" required maxLength={100} aria-invalid={submission.fieldErrors.last_name !== ''} aria-describedby="last-name-error" autoComplete="off" value={lastName} onChange={handleLastNameChange} className="casino-input aria-invalid:outline-2 aria-invalid:outline-[var(--vegas-wine)] min-h-11 min-w-0 w-full rounded-lg border border-current px-3 py-2" />
                                <p id="last-name-error" className="text-xs font-bold break-words">{submission.fieldErrors.last_name}</p>
                            </div>
                        </div>
                        <div className="create-account-field grid items-center gap-1 py-3 lg:grid-cols-[128px_minmax(0,1fr)] lg:gap-3">
                            <label htmlFor="email">Email <span aria-hidden="true">*</span></label>
                            <div className="min-w-0">
                                <input disabled={submission.isSubmitting} id="email" name="email" type="email" required maxLength={254} aria-invalid={submission.fieldErrors.email !== ''} aria-describedby="email-error" autoComplete="off" value={email} onChange={handleEmailChange} className="casino-input aria-invalid:outline-2 aria-invalid:outline-[var(--vegas-wine)] min-h-11 min-w-0 w-full rounded-lg border border-current px-3 py-2" />
                                <p id="email-error" className="text-xs font-bold break-words">{submission.fieldErrors.email}</p>
                            </div>
                        </div>
                        <div className="create-account-field grid items-center gap-1 py-3 lg:grid-cols-[128px_minmax(0,1fr)] lg:gap-3">
                            <label htmlFor="phone">Phone <span className="text-xs">(optional)</span></label>
                            <div className="min-w-0">
                                <input disabled={submission.isSubmitting} id="phone" name="phone" type="tel" aria-invalid={submission.fieldErrors.phone !== ''} aria-describedby="phone-error" autoComplete="off" value={phone} onChange={handlePhoneChange} className="casino-input aria-invalid:outline-2 aria-invalid:outline-[var(--vegas-wine)] min-h-11 min-w-0 w-full rounded-lg border border-current px-3 py-2" />
                                <p id="phone-error" className="text-xs font-bold break-words">{submission.fieldErrors.phone}</p>
                            </div>
                        </div>

                        {/* React keeps the chosen role while the other fields change. */}
                        <div className="create-account-field grid items-center gap-1 py-3 lg:grid-cols-[128px_minmax(0,1fr)] lg:gap-3">
                            <label htmlFor="role">Role <span aria-hidden="true">*</span></label>
                            <div className="min-w-0">
                                <select id="role" name="role" required value={selectedRole} onChange={handleRoleChange} disabled={submission.isSubmitting || roleChoices.isLoadingRoles || roleChoices.roles.length === 0} aria-invalid={submission.fieldErrors.role !== ''} aria-describedby="roles-message role-error" className="casino-input aria-invalid:outline-2 aria-invalid:outline-[var(--vegas-wine)] min-h-11 min-w-0 w-full rounded-lg border border-current px-3 py-2 focus-visible:outline-3 focus-visible:outline-offset-4 focus-visible:outline-[var(--vegas-focus)]">
                                    <option value="" disabled>Select a role</option>
                                    {roleOptions}
                                </select>
                                <p id="role-error" className="text-xs font-bold break-words">{submission.fieldErrors.role}</p>
                            </div>
                        </div>
                        {/* Announce request feedback using the same pattern as Sign In. */}
                        <p id="roles-message" role="status" className="mt-2 min-h-5 text-center text-sm">
                            {roleChoices.rolesMessage}
                        </p>

                        {/* Submit the surrounding account form. */}
                        <button type="submit" disabled={submission.isSubmitting || profilePhoto.isCheckingPhoto || roleChoices.isLoadingRoles || roleChoices.roles.length === 0} className="casino-button casino-heading create-account-submit mt-6 mb-4 min-h-12 w-full rounded-full px-4 py-3 uppercase">
                            Create User
                        </button>
                        {/* Keep feedback mounted so assistive technology can announce updates. */}
                        <p role="status" aria-atomic="true" className="min-h-5 text-center text-sm break-words">
                            {submission.submitMessage}
                        </p>
                        {/* Display the successful creation result from React state. */}
                        {accountResult}
                    </form>
                </CasinoTicket>
            </div>
        </div>
    )
}

export default CreateUser
