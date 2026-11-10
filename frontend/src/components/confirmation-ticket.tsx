import { useLayoutEffect, useRef } from 'react';
import type { SyntheticEvent } from 'react';
import CasinoTicket from './casino-ticket';
import './confirmation-ticket.css';

type ConfirmationTicketProps = {
    isOpen: boolean;
    title: string;
    message: string;
    confirmLabel: string;
    onCancel: () => void;
    onConfirm: () => void;
};

export default function ConfirmationTicket(props: ConfirmationTicketProps) {
    const dialogRef = useRef<HTMLDialogElement>(null);

    useLayoutEffect(function () {
        const dialog = dialogRef.current;

        if (dialog === null) {
            return;
        }

        // Open as a modal so the form behind the ticket cannot be edited.
        if (props.isOpen && !dialog.open) {
            dialog.showModal();
        } else if (!props.isOpen && dialog.open) {
            dialog.close();
        }
    }, [props.isOpen]);

    function handleEscape(event: SyntheticEvent<HTMLDialogElement>) {
        // Let React close the ticket through the same path as the Cancel button.
        event.preventDefault();
        props.onCancel();
    }

    return (
        <dialog
            ref={dialogRef}
            onCancel={handleEscape}
            className="confirmation-ticket-dialog m-auto w-[calc(100%-2rem)] max-w-sm bg-transparent"
        >
            <CasinoTicket compactEdges className="grid gap-4 p-6 text-center">
                {/* Confirmation prompt */}
                <h2 className="casino-heading casino-title-band px-2 py-3 text-2xl uppercase">
                    {props.title}
                </h2>
                <p>{props.message}</p>

                {/* Confirmation actions */}
                <div className="flex flex-wrap justify-center gap-3">
                    <button
                        type="button"
                        onClick={props.onCancel}
                        className="casino-heading min-h-11 rounded-full border px-4 py-2 text-lg uppercase"
                    >
                        Cancel
                    </button>
                    <button
                        type="button"
                        onClick={props.onConfirm}
                        className="casino-button casino-heading min-h-11 rounded-full px-4 py-2 text-lg uppercase"
                    >
                        {props.confirmLabel}
                    </button>
                </div>
            </CasinoTicket>
        </dialog>
    );
}
