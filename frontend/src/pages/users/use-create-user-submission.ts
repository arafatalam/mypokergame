import { useEffect, useRef, useState } from 'react'
import axios from 'axios'

type CreatedAccount = {
    username: string
    generated_password: string
}

type CreateUserDetails = {
    firstName: string
    lastName: string
    email: string
    phone: string
    selectedRole: string
    photo: File | null
}

function useCreateUserSubmission() {
    // Keep the credentials returned by a successful account creation.
    const [createdAccount, setCreatedAccount] = useState<CreatedAccount | null>(null)
    const [isSubmitting, setIsSubmitting] = useState(false)
    const [submitMessage, setSubmitMessage] = useState('')
    // Laravel uses these field names in its validation response.
    const [fieldErrors, setFieldErrors] = useState({
        first_name: '',
        last_name: '',
        email: '',
        phone: '',
        role: '',
        photo: '',
    })
    // Only the request belonging to this displayed screen may update its feedback.
    const submissionRef = useRef(0)

    useEffect(function () {
        return function cleanup() {
            submissionRef.current += 1
        }
    }, [])

    function clearSubmissionFeedback() {
        // A changed form is no longer the form described by the last response.
        setCreatedAccount(null)
        setSubmitMessage('')
        setFieldErrors({
            first_name: '',
            last_name: '',
            email: '',
            phone: '',
            role: '',
            photo: '',
        })
    }

    async function submitAccount(details: CreateUserDetails, isBlocked: boolean) {
        // Ignore another submission while this request is running.
        if (isSubmitting || isBlocked) {
            return
        }

        submissionRef.current += 1
        const currentSubmission = submissionRef.current
        clearSubmissionFeedback()
        setIsSubmitting(true)
        setSubmitMessage('Creating account…')

        // Build the request contents from React's current state.
        const formData = new FormData()

        formData.append('first_name', details.firstName)
        formData.append('last_name', details.lastName)
        formData.append('email', details.email)
        formData.append('phone', details.phone)
        formData.append('role', details.selectedRole)

        // An absent photo should not become an uploaded file.
        if (details.photo !== null) {
            formData.append('photo', details.photo)
        }

        try {
            // Prepare Laravel's CSRF cookie before sending a protected write.
            await axios.get('/sanctum/csrf-cookie')

            // Do not start a write if this screen closed while preparing CSRF.
            if (currentSubmission !== submissionRef.current) {
                return
            }

            const response = await axios.post('/api/v1/users', formData)

            if (currentSubmission !== submissionRef.current) {
                return
            }

            // Move the returned credentials into React state.
            setCreatedAccount({
                username: response.data.username,
                generated_password: response.data.generated_password,
            })
            setSubmitMessage('')
        } catch (error) {
            if (currentSubmission !== submissionRef.current) {
                return
            }

            if (axios.isAxiosError(error)) {
                const status = error.response?.status

                if (status === 422) {
                    const errors = error.response?.data.errors ?? {}

                    // Keep all messages for each field together beside its control.
                    setFieldErrors({
                        first_name: errors.first_name?.join(' ') ?? '',
                        last_name: errors.last_name?.join(' ') ?? '',
                        email: errors.email?.join(' ') ?? '',
                        phone: errors.phone?.join(' ') ?? '',
                        role: errors.role?.join(' ') ?? '',
                        photo: errors.photo?.join(' ') ?? '',
                    })
                    setSubmitMessage('Check the highlighted fields and try again.')
                } else if (status === 401 || status === 419) {
                    setSubmitMessage('Your session has expired. Sign in again before creating an account.')
                } else if (status === 403) {
                    setSubmitMessage('You do not have permission to create this account.')
                } else {
                    // A missing response does not prove that Laravel failed to save.
                    setSubmitMessage('Could not confirm account creation. Check your connection and whether the account exists before trying again.')
                }
            } else {
                setSubmitMessage('An unexpected error occurred. Check whether the account exists before trying again.')
            }
        } finally {
            // Allow another attempt after either success or failure.
            if (currentSubmission === submissionRef.current) {
                setIsSubmitting(false)
            }
        }
    }

    return {
        createdAccount,
        isSubmitting,
        submitMessage,
        fieldErrors,
        clearSubmissionFeedback,
        submitAccount,
    }
}

export default useCreateUserSubmission
