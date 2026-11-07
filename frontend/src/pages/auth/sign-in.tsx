import casinoLogo from '../../assets/casino/skanders-game-logo.png'
import CasinoTicket from '../../components/casino-ticket'
import axios from 'axios'
import type { ChangeEvent, SubmitEvent } from 'react'
import { useState } from 'react'

function SignIn() {

    const [isPasswordVisible, setIsPasswordVisible] = useState(false)
    const [submitMessage, setSubmitMessage] = useState('')
    const [isSubmitting, setIsSubmitting] = useState(false)

    const [login, setLogin] = useState('')
    const [password, setPassword] = useState('')
    const [remember, setRemember] = useState(false)

    function handlePasswordToggle() {
        setIsPasswordVisible(!isPasswordVisible)
    }

    // Keep React's stored values in step with Sam's typing.
    function handleLoginChange(event: ChangeEvent<HTMLInputElement>) {
        setLogin(event.currentTarget.value)
    }

    function handlePasswordChange(event: ChangeEvent<HTMLInputElement>) {
        setPassword(event.currentTarget.value)
    }

    function handleRememberChange(event: ChangeEvent<HTMLInputElement>) {
        setRemember(event.currentTarget.checked)
    }

    async function handleSubmit(event: SubmitEvent<HTMLFormElement>) {
        event.preventDefault()

        // Ignore another submission while the current request is running.
        if (isSubmitting) {
            return
        }

        setIsSubmitting(true)
        setSubmitMessage('Preparing sign in...')

        try {
            // Prepare CSRF protection before submitting the form values.
            await axios.get('/sanctum/csrf-cookie')

            await axios.post(
                '/api/v1/login',
                {
                    login: login,
                    password: password,
                    remember: remember,
                }
            )

            // Open Home only after Laravel accepts the sign-in.
            window.location.replace('/home')

        } catch (error) {
            // Show Laravel's explanation when form validation fails.
            if (axios.isAxiosError<{ message: string }>(error)) {
                if (error.response?.status === 422) {
                    setSubmitMessage(error.response.data.message)
                    return
                }
            }

            setSubmitMessage('Could not submit sign in. Please try again.')
        } finally {
            // Allow another attempt after success or failure, including early returns.
            setIsSubmitting(false)
        }
    }

    // Keep the input and its button describing the same visibility state.
    let passwordInputType = 'password'
    let passwordButtonText = 'Show'

    if (isPasswordVisible) {
        passwordInputType = 'text'
        passwordButtonText = 'Hide'
    }

    return (
        <div className="sign-in-screen flex min-h-screen flex-col justify-center px-5 py-8 sm:p-6">
            {/* Identify the app using its approved logo. */}
            <h1>
                <img
                    src={casinoLogo}
                    alt="Skander’s Game"
                    className="mx-auto w-72 max-w-full"
                />
            </h1>

            <CasinoTicket className="mx-auto mt-6 w-full max-w-md px-7 py-8 sm:p-8">

                {/* Handle the Sign In button and Enter through the same form. */}
                <form onSubmit={handleSubmit} aria-labelledby="sign-in-title">
                    {/* Ticket introduction */}
                    <h2 id="sign-in-title" className="casino-heading casino-title-band mb-2 p-2 text-center text-3xl uppercase">
                        Sign In
                    </h2>
                    <p className="mb-6 text-center">Your next poker night starts here.</p>

                    {/* Explicit labels keep fields accessible without relying on placeholders. */}
                    <div className="flex flex-col gap-2">
                        <label htmlFor="login">Username or email</label>
                        <input
                            id="login"
                            name="login"
                            type="text"
                            value={login}
                            onChange={handleLoginChange}
                            autoComplete="username"
                            className="casino-input min-w-0 w-full rounded-lg border p-2"
                        />
                    </div>

                    {/* Reserve input space so the future visibility control never covers text. */}
                    <div className="mt-4 flex flex-col gap-2">
                        <label htmlFor="password">Password</label>
                        <div className="relative">
                            <input
                                id="password"
                                name="password"
                                type={passwordInputType}
                                value={password}
                                onChange={handlePasswordChange}
                                autoComplete="current-password"
                                className="casino-input min-w-0 w-full rounded-lg border p-2 pr-20"
                            />

                            <button
                                type="button"
                                onClick={handlePasswordToggle}
                                aria-controls="password"
                                aria-label={passwordButtonText + ' password'}
                                className="absolute inset-y-0 right-0 px-3 text-sm underline"
                            >
                                {passwordButtonText}
                            </button>
                        </div>
                    </div>

                    {/* Keep Sam's preference in React state for the login request. */}
                    <label className="mt-4 flex min-h-11 w-fit cursor-pointer items-center gap-2">
                        <input
                            type="checkbox"
                            name="remember"
                            checked={remember}
                            onChange={handleRememberChange}
                            className="size-4 accent-[var(--vegas-red)]"
                        />
                        Remember me
                    </label>

                    {/* Submit the surrounding form. */}
                    <button
                        type="submit"
                        disabled={isSubmitting}
                        className="casino-button mt-4 min-h-11 w-full rounded-full px-4 py-2 text-2xl uppercase"
                    >
                        {isSubmitting ? 'Signing in…' : 'Sign In'}
                    </button>

                    {/* Announce feedback while keeping space reserved in the ticket. */}
                    <p role="status" className="mt-4 min-h-5 text-center text-sm">
                        {submitMessage}
                    </p>
                </form>

            </CasinoTicket>
        </div>
    )
}

export default SignIn
