import CasinoTicket from '../../../components/casino-ticket'
import useProfilePhoto from '../shared-resources/use-profile-photo'

type ProfilePhotoFieldProps = {
    onPhotoChange?: (photo: File | null) => void
    onPhotoCheckingChange?: (isChecking: boolean) => void
    isSubmitting?: boolean
}

export default function ProfilePhotoField(props: ProfilePhotoFieldProps) {
    const { photoInputRef, ...profilePhoto } = useProfilePhoto(undefined, props)
    const canClear = profilePhoto.photo !== null || profilePhoto.isCheckingPhoto
    let photoDescription = 'Sample profile portrait'
    let photoLabel = 'JPG, PNG or WebP. Original photo up to 10 MB.'

    if (profilePhoto.photo !== null) {
        photoDescription = 'Selected profile photo'
        photoLabel = profilePhoto.photoName
    }

    if (profilePhoto.photoMessage !== '') {
        photoLabel = profilePhoto.photoMessage
    }

    return (
        // Photo ticket
        <CasinoTicket compactEdges borderInset={12} className="player-tab">
            <section className="flex flex-col items-center gap-4 p-2 text-center">

                <img src={profilePhoto.photoPreview} alt={photoDescription} className="aspect-square w-full max-w-40 rounded-full border-4 border-[#ffe9b8] object-cover" />
                <input
                    ref={photoInputRef}
                    disabled={props.isSubmitting}
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    onChange={profilePhoto.handlePhotoChange}
                    hidden />

                <div className="grid w-full grid-cols-2 gap-2 md:grid-cols-1">
                    <button
                        type="button"
                        disabled={props.isSubmitting}
                        onClick={profilePhoto.handleChoosePhotoClick}
                        className="create-user-photo-button min-h-11 rounded-full px-2 py-2"
                    >
                        Choose photo
                    </button>
                    <button type="button" disabled={props.isSubmitting || !canClear} onClick={profilePhoto.handleClearPhotoClick} className="create-user-photo-button min-h-11 rounded-full px-2 py-2">Clear photo</button>
                </div>
                <p className="max-w-full break-words text-sm">{photoLabel}</p>

            </section>
        </CasinoTicket>
    )
}
