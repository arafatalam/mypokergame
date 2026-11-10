import CasinoTicket from '../../../components/casino-ticket';
import UserProfilePhotoTicket from './user-profile-photo-ticket';

type UserProfileActionsProps = {
    userId: number | undefined;
    profileName: string | number;
    photoUrl: string | undefined;
    canChangePhoto: boolean;
    canChangePassword: boolean;
    hasUploadedPhoto: boolean;
    onChangePassword: () => void;
    isShowingPasswordTicket: boolean;
};

export default function UserProfileActions(props: UserProfileActionsProps) {

    let buttonLabel = <span>Change<br />password</span>;

    if (props.isShowingPasswordTicket) {
        buttonLabel = <span>User<br />details</span>;
    }

    let passwordActionTicket = null;

    if (props.canChangePassword) {
        passwordActionTicket = (
            <CasinoTicket compactEdges className="show-user-password-ticket grid items-center px-5 py-4 text-center">
                <button type="button"
                        onClick={props.onChangePassword}
                        className="show-user-password-label casino-heading grid w-full grid-cols-[1fr_auto_1fr] items-center gap-2 uppercase"
                >
                    <span className="show-user-password-suit">♣</span>
                    {buttonLabel}
                    <span className="show-user-password-suit">♣</span>
                </button>
            </CasinoTicket>
        );
    }

    return (
        <div className="grid min-w-0 grid-rows-[auto_1fr] gap-3">
            <UserProfilePhotoTicket
                userId={props.userId}
                profileName={props.profileName}
                photoUrl={props.photoUrl}
                canChangePhoto={props.canChangePhoto}
                hasUploadedPhoto={props.hasUploadedPhoto}
            />

            {passwordActionTicket}
        </div>
    );
}
