import casinoLogo from '../assets/casino/skanders-game-logo.png'
import CasinoTicket from '../components/casino-ticket'
import axios from 'axios'
import { useState } from 'react'

function Home() {
    const [isSigningOut, setIsSigningOut] = useState(false)
    const [statusMessage, setStatusMessage] = useState('')

    async function handleSignOut() {
        if (isSigningOut) {
            return
        }

        setIsSigningOut(true)
        setStatusMessage('Signing out…')

        try {
            await axios.post('/api/v1/logout')

            // Reload React only after Laravel has ended the session.
            window.location.replace('/sign-in')
        } catch (error) {
            // An expired session already means Sam is signed out.
            if (axios.isAxiosError(error)) {
                if (error.response?.status === 401) {
                    window.location.replace('/sign-in')
                    return
                }
            }

            setStatusMessage('Could not sign out. Please try again.')
            setIsSigningOut(false)
        }
    }

    return (
        <div className="flex min-h-screen flex-col justify-center px-5 py-8 sm:p-6">
            {/* Identify the app using the shared logo. */}
            <h1>
                <img
                    src={casinoLogo}
                    alt="Skander’s Game"
                    className="mx-auto w-72 max-w-full"
                />
            </h1>

            {/* Welcome Sam inside the existing cream ticket. */}
            <CasinoTicket className="mx-auto mt-6 w-full max-w-md px-7 py-8 sm:p-8">
                <h2 className="casino-heading casino-title-band mb-2 p-2 text-center text-3xl uppercase">
                    Home
                </h2>
                <p className="text-center">
                    Welcome to Skander’s Game
                </p>

                {/* Ask Laravel to end the session before leaving Home. */}
                <button
                    type="button"
                    onClick={handleSignOut}
                    disabled={isSigningOut}
                    className="casino-button mt-6 min-h-11 w-full rounded-full px-4 py-2 text-2xl uppercase"
                >
                    Sign Out
                </button>

                <p role="status" className="mt-4 min-h-5 text-center text-sm">
                    {statusMessage}
                </p>
            </CasinoTicket>
        </div>
    )
}

export default Home
