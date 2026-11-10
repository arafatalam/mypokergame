import SignIn from "./pages/auth/sign-in";
import SignedInLayout from './pages/signed-in-layout';
import axios from 'axios';
import { useEffect, useState } from 'react';

// Keep the possible session outcomes explicit.
type SessionStatus = 'checking' | 'signed-in' | 'guest' | 'error';

function App() {

    const [sessionStatus, setSessionStatus] = useState<SessionStatus>('checking');
    const [signedInUserId, setSignedInUserId] = useState<number | null>(null);

    // Observe React's current state without changing the displayed screen.
    // console.log('Session status:', sessionStatus)

    // Check the existing session when App opens.
    useEffect(function () {
        let ignoreResult = false;

        async function checkSession() {
            try {
                const response = await axios.get('/api/v1/user');
                if (ignoreResult) {
                    return;
                }

                setSignedInUserId(response.data.id);
                setSessionStatus('signed-in');
            } catch (error) {
                if (ignoreResult) {
                    return;
                }

                // Only 401 confirms that Sam has no authenticated session.
                if (axios.isAxiosError(error)) {
                    if (error.response?.status === 401) {
                        // Move guests to the Sign In URL before displaying the form.
                        if (window.location.pathname !== '/sign-in') {
                            window.location.replace('/sign-in');
                            return;
                        }

                        setSessionStatus('guest');
                        return;
                    }
                }

                // A server or connection problem does not mean Sam is a guest.
                setSessionStatus('error');
            }
        }

        // Start the request without returning its promise to React.
        void checkSession();

        // Ignore a late response after React stops using this Effect.
        return function cleanup() {
            ignoreResult = true;
        };
    }, []);


    // Show a status message until Laravel answers.
    let content = <p role="status">Checking your session…</p>;

    if (sessionStatus === 'signed-in' && signedInUserId !== null) {
        content = <SignedInLayout signedInUserId={signedInUserId} />;
    }

    if (sessionStatus === 'guest') {
        content = <SignIn />;
    }

    if (sessionStatus === 'error') {
        content = (
            <p role="status">
                Could not check your session. Refresh to try again.
            </p>
        );
    }

    return (
        <main className="casino-scenery min-h-screen">
            {/* Display the content selected from the session result. */}
            {content}
        </main>
    );
}

export default App;
