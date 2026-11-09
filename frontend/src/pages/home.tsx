import casinoLogo from '../assets/casino/skanders-game-logo.png'
import NavigationGroup from '../components/navigation-group'
import CasinoMarquee from '../components/casino-marquee'
import './home.css'
import CreateUser from './users/create-user/create-user.tsx'
import { signOut } from './auth/sign-out'
import { useState } from 'react'
import UserList from "./users/user-list/user-list.tsx";

function Home() {

    const [selectedPage, setSelectedPage] = useState('home')
    const [isSigningOut, setIsSigningOut] = useState(false)
    const [signOutMessage, setSignOutMessage] = useState('')

    // Choose which screen appears inside Home.
    let content = null

    if (selectedPage === 'create') {
        content = <CreateUser />
    } else if (selectedPage === 'list') {
        content = <UserList />
    }

    function handleUserSelection(task: string) {
        setSelectedPage(task)

    }

    async function handleAccountSelection(task: string) {
        if (task !== 'sign-out' || isSigningOut) {
            return
        }

        setIsSigningOut(true)
        setSignOutMessage('Signing out…')

        try {
            await signOut()
        } catch {
            setSignOutMessage('Could not sign out. Please try again.')
            setIsSigningOut(false)
        }
    }

    return (
        <div className="home-viewport overflow-x-clip">
            <div className="home-screen relative min-h-screen w-full has-[.user-list-screen]:flex has-[.user-list-screen]:flex-col">
                <a className="home-skip-link" href="#task-content">Skip to content</a>
                {/* Keep banner sizing separate from the full-width task area. */}
                <div className="home-banner mx-auto w-full max-w-[1536px] shrink-0">
                {/* Group buttons expand choices without replacing the current page. */}
                <header className="home-header relative flex items-start">
                    <h1 className="home-brand shrink-0">
                        <img src={casinoLogo} alt="Skander’s Game" className="block h-auto w-full" />
                    </h1>
                    <nav className="home-navigation flex min-w-0 flex-1 items-center" aria-label="Main tasks">
                        <button type="button" className="home-link"><span>Home</span></button>
                        <NavigationGroup
                            label="Users"
                            view="users"
                            onSelect={handleUserSelection}
                            items={[
                                { task: 'create', label: 'Create User' },
                                { task: 'list', label: 'User List' },
                            ]}
                        />
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
                        <NavigationGroup label="Accounts" view="my-account" onSelect={handleAccountSelection} items={[
                            { task: 'profile', label: 'My Account' },
                            { task: 'sign-out', label: 'Sign Out' },
                        ]} />
                    </nav>
                </header>
                </div>

                <p className="home-status text-center text-sm">{signOutMessage}</p>

                {/* Keep one shared sign above whichever screen is selected. */}
                {/* On User List, fill the space below the header so auto margin can push the ticket down. */}
                <div id="task-content" className="home-content has-[>.user-list-screen]:flex has-[>.user-list-screen]:flex-1 has-[>.user-list-screen]:flex-col [&>.casino-marquee]:shrink-0" tabIndex={-1}>
                    <CasinoMarquee text="users" id="user-list-title" />
                    {content}
                </div>
            </div>

        </div>
    )
}

export default Home
