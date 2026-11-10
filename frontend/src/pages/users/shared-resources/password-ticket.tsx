import axios from 'axios';
import CasinoTicket from '../../../components/casino-ticket';
import ConfirmationTicket from '../../../components/confirmation-ticket';
import { useId, useRef, useState, type ChangeEvent } from 'react';
import { updateUserPassword } from './update-user-password';

type PasswordTicketProps = {
    userId: number;
};

export default function PasswordTicket(props: PasswordTicketProps) {
    const fieldId = useId();
    const passwordId = fieldId + '-password';
    const confirmationId = fieldId + '-confirmation';

    const [password, setPassword] = useState('');
    const [passwordConfirmation, setPasswordConfirmation] = useState('');
    const [isPasswordVisible, setIsPasswordVisible] = useState(false);
    const [isConfirmationVisible, setIsConfirmationVisible] = useState(false);
    const [isConfirmationOpen, setIsConfirmationOpen] = useState(false);
    const [confirmationMessage, setConfirmationMessage] = useState('');
    const [isUpdatingPassword, setIsUpdatingPassword] = useState(false);
    const updateInProgress = useRef(false);

    function handlePasswordChange(event: ChangeEvent<HTMLInputElement>) {
        setPassword(event.currentTarget.value);
    }
    function handlePasswordConfirmationChange(event: ChangeEvent<HTMLInputElement>) {
        setPasswordConfirmation(event.currentTarget.value);
    }

    function handlePasswordToggle() {
        setIsPasswordVisible(!isPasswordVisible);
    }

    function handleConfirmationToggle() {
        setIsConfirmationVisible(!isConfirmationVisible);
    }

    let passwordInputType = 'password';
    let passwordButtonText = 'Show';
    if (isPasswordVisible) {
        passwordInputType = 'text';
        passwordButtonText = 'Hide';
    }

    let confirmationInputType = 'password';
    let confirmationButtonText = 'Show';
    if (isConfirmationVisible) {
        confirmationInputType = 'text';
        confirmationButtonText = 'Hide';
    }

    let passwordMismatchMessage = null;

    if (passwordConfirmation !== '' && password !== passwordConfirmation) {
        passwordMismatchMessage = <p className="text-sm">Passwords don’t match yet.</p>;
    }

    const canContinue = !isUpdatingPassword && password !== '' && password === passwordConfirmation;

    function handleUpdatePassword() {
        // Mask both fields before opening the confirmation.
        setIsPasswordVisible(false);
        setIsConfirmationVisible(false);
        setConfirmationMessage('');
        setIsConfirmationOpen(true);
    }

    function handleCancelConfirmation() {
        setIsConfirmationOpen(false);
    }

    async function handleConfirmPasswordUpdate() {
        if (updateInProgress.current || !canContinue) {
            return;
        }

        setIsConfirmationOpen(false);

        // Games → Create Game uses ID 0 for the preview.
        if (props.userId === 0) {
            setConfirmationMessage('Password update confirmed.');
            return;
        }

        // Lock immediately, before React renders the disabled controls.
        updateInProgress.current = true;
        setIsUpdatingPassword(true);
        setConfirmationMessage('Updating password…');

        try {
            await updateUserPassword(props.userId, password, passwordConfirmation);

            setPassword('');
            setPasswordConfirmation('');
            setConfirmationMessage('Password updated successfully.');
        } catch (error) {
            let message = 'Could not confirm the password update.';

            if (axios.isAxiosError<{ errors?: { password?: string[] } }>(error) && error.response?.status === 422) {
                message = error.response.data.errors?.password?.[0] ?? message;
            }

            setConfirmationMessage(message);
        } finally {
            updateInProgress.current = false;
            setIsUpdatingPassword(false);
        }
    }

    return (
        <section className="mx-auto w-full max-w-md" data-user-id={props.userId}>
            <CasinoTicket className="px-8 py-7">
                <h2 className="casino-heading casino-title-band p-2 text-center text-3xl uppercase">
                    Update Password
                </h2>
                <p className="mt-3 text-center text-sm">
                    Other browsers signed in to this account may be signed out.
                </p>

                <div className="mt-5 flex flex-col gap-2">
                    <label htmlFor={passwordId}>New password</label>
                    <div className="relative">
                        <input
                            id={passwordId}
                            type={passwordInputType}
                            value={password}
                            onChange={handlePasswordChange}
                            autoComplete="new-password"
                            readOnly={isUpdatingPassword}
                            className="casino-input min-w-0 w-full rounded-lg border p-2 pr-20"
                        />
                        <button
                            type="button"
                            onClick={handlePasswordToggle}
                            disabled={isUpdatingPassword}
                            className="absolute inset-y-0 right-0 px-3 text-sm underline disabled:opacity-50"
                        >
                            {passwordButtonText}
                        </button>
                    </div>
                </div>
                <div className="mt-4 flex flex-col gap-2">
                    <label htmlFor={confirmationId}>Confirm new password</label>
                    <div className="relative">
                        <input
                            id={confirmationId}
                            type={confirmationInputType}
                            value={passwordConfirmation}
                            onChange={handlePasswordConfirmationChange}
                            autoComplete="new-password"
                            readOnly={isUpdatingPassword}
                            className="casino-input min-w-0 w-full rounded-lg border p-2 pr-20"
                        />
                        <button
                            type="button"
                            onClick={handleConfirmationToggle}
                            disabled={isUpdatingPassword}
                            className="absolute inset-y-0 right-0 px-3 text-sm underline disabled:opacity-50"
                        >
                            {confirmationButtonText}
                        </button>
                    </div>
                    {passwordMismatchMessage}
                </div>

                <button
                    type="button"
                    disabled={!canContinue}
                    onClick={handleUpdatePassword}
                    className="casino-button mt-5 min-h-11 w-full rounded-full px-4 py-2 text-2xl uppercase disabled:opacity-50"
                >
                    Update password
                </button>
                <p className="text-center text-sm">{confirmationMessage}</p>
            </CasinoTicket>

            <ConfirmationTicket
                isOpen={isConfirmationOpen}
                title="Confirm Password Update"
                message="Update the password for this account?"
                confirmLabel="Update password"
                onCancel={handleCancelConfirmation}
                onConfirm={handleConfirmPasswordUpdate}
            />
        </section>
    );
}
