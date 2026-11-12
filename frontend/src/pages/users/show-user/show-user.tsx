import UserGameHistory from './user-game-history';
import UserPaymentHistory from './user-payment-history';
import UserProfileActions from './user-profile-actions';
import UserProfileDetails from './user-profile-details';
import useLoadedUserProfile from './use-loaded-user-profile';
import useUserProfileDetails from './use-user-profile-details';
import './show-user.css';
import { useState } from 'react';
import PasswordTicket from '../shared-resources/password-ticket';

type ShowUserProps = {
    userId?: number;
    viewOnly?: boolean;
    showSideArtwork?: boolean;
};

function ShowUser(props: ShowUserProps) {
    const userId = props.userId;
    const [isPasswordTicketOpen, setIsPasswordTicketOpen] = useState(false);

    // Load the account selected in User List and keep its saved details here for both tickets.
    const loadedUser = useLoadedUserProfile(userId);
    const profile = loadedUser.profile;
    const canChangePassword = profile?.can_change_password === true;

    // After Save, the edit hook passes Laravel's saved profile to both tickets.
    const details = useUserProfileDetails(profile, loadedUser.setLoadedProfile);

    // Use the account ID until the name is available, and show the current load status here.
    let profileName = profile?.first_name ?? userId ?? 'First Name';
    if (userId !== undefined && loadedUser.isLoadingProfile) {
        profileName = 'Loading profile…';
    } else if (userId !== undefined && loadedUser.profileLoadFailed) {
        profileName = 'Profile unavailable';
    }

    function handleChangePassword() {
        setIsPasswordTicketOpen(!isPasswordTicketOpen);
    }

    const detailsTicket = (
        <UserProfileDetails
            saveMessage={details.saveMessage}
            fieldErrors={details.fieldErrors}
            username={profile?.username ?? ''}
            areDetailsReadOnly={props.viewOnly === true || details.areDetailsReadOnly}
            firstNameValue={details.firstNameValue}
            onFirstNameChange={details.handleFirstNameChange}
            lastNameValue={details.lastNameValue}
            onLastNameChange={details.handleLastNameChange}
            emailValue={details.emailValue}
            onEmailChange={details.handleEmailChange}
            phoneValue={details.phoneValue}
            onPhoneChange={details.handlePhoneChange}
            isDetailsButtonDisabled={props.viewOnly === true || details.isDetailsButtonDisabled}
            onDetailsButtonClick={details.detailsButtonHandler}
            detailsButtonLabel={details.detailsButtonLabel}
        />
    );
    let displayedTicket = detailsTicket;

    // Open the password ticket once the target profile has loaded.
    if (isPasswordTicketOpen && canChangePassword && profile !== null) {
        displayedTicket = <PasswordTicket key={'password-' + profile.id} userId={profile.id} />;
    }

    let paymentHistory = null;
    if (!props.showSideArtwork && profile?.can_view_payment_history === true) {
        // Reset pagination when switching players and keep the key distinct from the photo controls.
        paymentHistory = <UserPaymentHistory key={'payment-history-' + profile.id} playerId={profile.id} />;
    }

    let gameHistory = null;
    if (!props.showSideArtwork && profile?.can_view_game_history === true) {
        gameHistory = <UserGameHistory key={'game-history-' + profile.id} playerId={profile.id} />;
    }

    let layoutClassName = 'show-user-layout mx-auto grid w-full max-w-[800px] gap-4 px-4';
    if (paymentHistory !== null) {
        layoutClassName += ' show-user-layout-with-history';
    }
    if (gameHistory !== null) {
        layoutClassName += ' show-user-layout-with-game-history';
    }
    if (props.showSideArtwork) {
        layoutClassName += ' show-user-layout-with-artwork';
    }

    return (
        <div className={layoutClassName}>
            {/* Reset an unsaved photo preview when the selected account changes. */}
            <UserProfileActions
                key={userId}
                userId={userId}
                profileName={profileName}
                photoUrl={profile?.photo_url}
                canChangePhoto={profile?.can_change_photo === true}
                hasUploadedPhoto={profile?.has_uploaded_photo === true}
                canChangePassword={canChangePassword}
                onChangePassword={handleChangePassword}
                isShowingPasswordTicket={isPasswordTicketOpen && profile !== null}
            />

            {/* Details ticket or password ticket */}
            {displayedTicket}
            {paymentHistory !== null && (
                <div className="show-user-history-card show-user-payment-history min-w-0">
                    {paymentHistory}
                </div>
            )}
            {gameHistory !== null && (
                <div className="show-user-history-card show-user-game-history min-w-0">
                    {gameHistory}
                </div>
            )}

        </div>
    );
}

export default ShowUser;
