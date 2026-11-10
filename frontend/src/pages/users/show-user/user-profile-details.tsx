import type { ChangeEvent } from 'react';

import CasinoTicket from '../../../components/casino-ticket';
import type { ProfileDetailsErrors } from './use-user-profile-details';

type UserProfileDetailsProps = {
    saveMessage: string;
    fieldErrors: ProfileDetailsErrors;
    username: string;
    areDetailsReadOnly: boolean;
    firstNameValue: string;
    onFirstNameChange: (event: ChangeEvent<HTMLInputElement>) => void;
    lastNameValue: string;
    onLastNameChange: (event: ChangeEvent<HTMLInputElement>) => void;
    emailValue: string;
    onEmailChange: (event: ChangeEvent<HTMLInputElement>) => void;
    phoneValue: string;
    onPhoneChange: (event: ChangeEvent<HTMLInputElement>) => void;
    isDetailsButtonDisabled: boolean;
    onDetailsButtonClick: () => void;
    detailsButtonLabel: string;
};

function renderFieldError(messages: string[] | undefined) {
    if (!messages?.length) {
        return null;
    }

    return <span>{messages.join(' ')}</span>;
}

export default function UserProfileDetails(props: UserProfileDetailsProps) {
    let saveFeedback = null;

    if (props.saveMessage !== '') {
        saveFeedback = <p>{props.saveMessage}</p>;
    }

    return (
        <CasinoTicket compactEdges className="show-user-details-ticket min-w-0 px-7 py-6">
            <div className="grid gap-3">
                <label className="grid gap-1">
                    Username
                    <input
                        className="casino-input show-user-input"
                        type="text"
                        value={props.username}
                        readOnly
                    />
                </label>
                <label className="grid gap-1">
                    First name
                    <input
                        className="casino-input show-user-input"
                        type="text"
                        value={props.firstNameValue}
                        onChange={props.onFirstNameChange}
                        readOnly={props.areDetailsReadOnly}
                    />
                    {renderFieldError(props.fieldErrors.first_name)}
                </label>
                <label className="grid gap-1">
                    Last name
                    <input
                        className="casino-input show-user-input"
                        type="text"
                        value={props.lastNameValue}
                        onChange={props.onLastNameChange}
                        readOnly={props.areDetailsReadOnly}
                    />
                    {renderFieldError(props.fieldErrors.last_name)}
                </label>
                <label className="grid gap-1">
                    Email
                    <input
                        className="casino-input show-user-input"
                        type="email"
                        value={props.emailValue}
                        onChange={props.onEmailChange}
                        readOnly={props.areDetailsReadOnly}
                    />
                    {renderFieldError(props.fieldErrors.email)}
                </label>
                <label className="grid gap-1">
                    Phone (optional)
                    <input
                        className="casino-input show-user-input"
                        type="tel"
                        value={props.phoneValue}
                        onChange={props.onPhoneChange}
                        readOnly={props.areDetailsReadOnly}
                    />
                    {renderFieldError(props.fieldErrors.phone)}
                </label>
                {saveFeedback}
                <button
                    type="button"
                    disabled={props.isDetailsButtonDisabled}
                    onClick={props.onDetailsButtonClick}
                    className="casino-button casino-heading mx-auto mt-2 w-full max-w-xs rounded-full px-6 py-2 text-xl uppercase"
                >
                    {props.detailsButtonLabel}
                </button>
            </div>
        </CasinoTicket>
    );
}
