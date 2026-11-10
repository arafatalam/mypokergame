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

    let passwordMismatchMessage = null;

    if (passwordConfirmation !== '' && password !== passwordConfirmation) {
        passwordMismatchMessage = <p className="text-sm">Passwords don’t match yet.</p>;
    }

    const canContinue = !isUpdatingPassword && password !== '' && password === passwordConfirmation;

    function handleUpdatePassword() {
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
                    A password update signs this account out on every device.
                </p>

                <div className="mt-5 flex flex-col gap-2">
                    <label htmlFor={passwordId}>New password</label>
                    <input
                        id={passwordId}
                        type="password"
                        value={password}
                        onChange={handlePasswordChange}
                        autoComplete="new-password"
                        readOnly={isUpdatingPassword}
                        className="casino-input w-full rounded-lg border p-2"
                    />
                </div>
                <div className="mt-4 flex flex-col gap-2">
                    <label htmlFor={confirmationId}>Confirm new password</label>
                    <input
                        id={confirmationId}
                        type="password"
                        value={passwordConfirmation}
                        onChange={handlePasswordConfirmationChange}
                        autoComplete="new-password"
                        readOnly={isUpdatingPassword}
                        className="casino-input w-full rounded-lg border p-2"
                    />
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
                message="Update this password and sign this account out on every device?"
                confirmLabel="Update password"
                onCancel={handleCancelConfirmation}
                onConfirm={handleConfirmPasswordUpdate}
            />
        </section>
    );
}
