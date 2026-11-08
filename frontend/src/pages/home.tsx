import casinoLogo from '../assets/casino/skanders-game-logo.png'
import axios from 'axios'
import { useState } from 'react'
import { homeUrl, readHomeView } from '../navigation'
import NavigationGroup from '../components/navigation-group'
import CreateUser from './users/create-user'
import './home.css'

function Home() {
    const [isSigningOut, setIsSigningOut] = useState(false)
    const [statusMessage, setStatusMessage] = useState('')
    const view = readHomeView()
    const task = new URLSearchParams(window.location.search).get('task') ?? ''

    // Only the existing Create User form fills the content area at this checkpoint.
    let content = null

    if (view === 'users' && task === 'create') {
        content = <CreateUser />
    }

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
        <div className="home-viewport overflow-x-clip">
            <div className="home-screen relative mx-auto min-h-screen w-full max-w-[1536px]">
                <a className="home-skip-link" href="#task-content">Skip to content</a>
                {/* Group buttons expand choices without replacing the current page. */}
                <header className="home-header relative flex items-start">
                    <h1 className="home-brand shrink-0">
                        <img src={casinoLogo} alt="Skander’s Game" className="block h-auto w-full" />
                    </h1>
                    <nav className="home-navigation flex min-w-0 flex-1 items-center" aria-label="Main tasks">
                        <a className="home-link" href={homeUrl('home')}><span>Home</span></a>
                        <NavigationGroup label="Users" view="users" items={[
                            { task: 'create', label: 'Create User' },
                            { task: 'list', label: 'User List' },
                        ]} />
                        <NavigationGroup label="Games" view="games" items={[
                            { task: 'create', label: 'Create Game' },
                            { task: 'list', label: 'Game List' },
                            { task: 'buy-in', label: 'Record Buy-in' },
                            { task: 'cashout', label: 'Record Cashout' },
                            { task: 'settings', label: 'Game Settings' },
                        ]} />
                        <NavigationGroup label="Players" view="players" items={[
                            { task: 'list', label: 'Player List' },
                            { task: 'balances', label: 'Balances' },
                            { task: 'history', label: 'Player History' },
                            { task: 'payment', label: 'Record Payment' },
                        ]} />
                        <NavigationGroup label="Records" view="records" items={[
                            { task: 'correction', label: 'Record Correction' },
                            { task: 'missing', label: 'Missing Activity' },
                            { task: 'history', label: 'Correction History' },
                        ]} />
                    </nav>
                </header>

                <p role="status" className="home-status text-center text-sm">{statusMessage}</p>

                {/* Each future page will own its design; no default panels or lists. */}
                <div id="task-content" className="home-content" tabIndex={-1}>{content}</div>
            </div>

            {/* Account actions stay at the bottom left without covering the task content. */}
            <nav className="home-account-navigation flex items-center gap-3" aria-label="Account actions">
                <NavigationGroup label="My Account" view="my-account" items={[
                    { task: 'profile', label: 'My Profile' },
                    { task: 'password', label: 'Change Password' },
                ]} />
                <button type="button" onClick={handleSignOut} disabled={isSigningOut}><span>Sign Out</span></button>
            </nav>
        </div>
    )
}

export default Home
