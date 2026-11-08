import { useEffect, useRef, useState } from 'react'
import type { ChangeEvent } from 'react'
import samplePortrait from '../../assets/casino/sample-account-portrait.png'

function useProfilePhoto(clearSubmissionFeedback: () => void) {
    // Keep the chosen file for later submission and a local address for the portrait.
    const [photo, setPhoto] = useState<File | null>(null)
    const [photoPreview, setPhotoPreview] = useState(samplePortrait)
    const [photoMessage, setPhotoMessage] = useState('')
    const [isCheckingPhoto, setIsCheckingPhoto] = useState(false)
    const photoInputRef = useRef<HTMLInputElement>(null)
    // A newer choice or Clear must win over an older image check.
    const photoCheckRef = useRef(0)

    // Release each local image address when it is replaced or this screen closes.
    useEffect(function () {
        return function cleanup() {
            if (photoPreview !== samplePortrait) {
                URL.revokeObjectURL(photoPreview)
            }
        }
    }, [photoPreview])

    // Ignore unfinished image work after the screen closes.
    useEffect(function () {
        return function cleanup() {
            photoCheckRef.current += 1
        }
    }, [])

    function handleChoosePhotoClick() {
        const photoInput = photoInputRef.current

        if (photoInput !== null) {
            photoInput.click()
        }
    }

    async function handlePhotoChange(event: ChangeEvent<HTMLInputElement>) {
        const files = event.currentTarget.files

        if (files === null) {
            return
        }

        const selectedPhoto = files.item(0)

        // Cancelling the picker keeps the current portrait.
        if (selectedPhoto === null) {
            return
        }

        // React keeps the File; reset the picker so choosing it again still fires change.
        event.currentTarget.value = ''
        photoCheckRef.current += 1
        const currentCheck = photoCheckRef.current
        setIsCheckingPhoto(false)

        const allowedTypes = ['image/jpeg', 'image/png', 'image/webp']

        if (!allowedTypes.includes(selectedPhoto.type)) {
            setPhotoMessage('Choose a JPG, PNG or WebP image. Your current photo has not changed.')
            return
        }

        // Limit the original file before the browser processes it.
        if (selectedPhoto.size > 10 * 1024 * 1024) {
            setPhotoMessage('Choose an original image up to 10 MB. Your current photo has not changed.')
            return
        }

        setIsCheckingPhoto(true)
        setPhotoMessage('Checking photo…')

        try {
            const image = await createImageBitmap(selectedPhoto)

            // Read the dimensions before releasing the decoded image.
            const originalWidth = image.width
            const originalHeight = image.height

            const longestSide = Math.max(originalWidth, originalHeight)

            // A scale of 1 keeps smaller photos at their original size.
            const scale = Math.min(1, 1200 / longestSide)

            // Image dimensions need whole pixels and must stay above zero.
            const targetWidth = Math.max(1, Math.round(originalWidth * scale))
            const targetHeight = Math.max(1, Math.round(originalHeight * scale))

            try {
                // Skip drawing if another choice or Clear has replaced this check.
                if (currentCheck !== photoCheckRef.current) {
                    return
                }

                const canvas = document.createElement('canvas')
                canvas.width = targetWidth
                canvas.height = targetHeight

                const context = canvas.getContext('2d')

                if (context === null) {
                    throw new Error('Could not prepare the photo drawing surface.')
                }

                context.drawImage(image, 0, 0, targetWidth, targetHeight)

                function handleEncodedPhoto(blob: Blob | null) {
                    // A newer choice, Clear or closing this screen must win.
                    if (currentCheck !== photoCheckRef.current) {
                        return
                    }

                    if (blob === null || blob.type !== 'image/webp') {
                        setPhotoMessage('Could not compress this photo. Your current photo has not changed.')
                        setIsCheckingPhoto(false)
                        return
                    }

                    const compressedPhoto = new File([blob], 'profile-photo.webp', {
                        type: blob.type,
                    })

                    // Reject the processed file before changing the saved selection.
                    if (compressedPhoto.size > 2 * 1024 * 1024) {
                        setPhotoMessage('The compressed photo exceeds 2 MB. Choose another photo. Your current photo has not changed.')
                        setIsCheckingPhoto(false)
                        return
                    }

                    const compressedPreview = URL.createObjectURL(compressedPhoto)

                    clearSubmissionFeedback()
                    setPhoto(compressedPhoto)
                    setPhotoPreview(compressedPreview)
                    setPhotoMessage('Compressed photo ready. Preview only; not uploaded.')
                    setIsCheckingPhoto(false)

                }
                canvas.toBlob(handleEncodedPhoto, 'image/webp', 0.8)

            } finally {
                // Release the decoded original even if drawing fails or we return early.
                image.close()
            }

        } catch {
            if (currentCheck === photoCheckRef.current) {
                setPhotoMessage('This image could not be read. Choose another photo. Your current photo has not changed.')
                setIsCheckingPhoto(false)
            }
            return
        }

    }

    function handleClearPhotoClick() {
        clearSubmissionFeedback()
        photoCheckRef.current += 1
        setPhoto(null)
        setPhotoPreview(samplePortrait)
        setPhotoMessage('Photo cleared. No personal photo selected.')
        setIsCheckingPhoto(false)

        const photoInput = photoInputRef.current

        if (photoInput !== null) {
            photoInput.value = ''
        }
    }

    return {
        photo,
        photoPreview,
        photoMessage,
        isCheckingPhoto,
        photoInputRef,
        handleChoosePhotoClick,
        handlePhotoChange,
        handleClearPhotoClick,
    }
}

export default useProfilePhoto
