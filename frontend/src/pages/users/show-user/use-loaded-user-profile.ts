import axios from 'axios';
import { useEffect, useState } from 'react';

import { loadUserProfile, type UserProfile } from './load-user-profile';

export default function useLoadedUserProfile(userId: number | undefined) {
    const [loadedProfile, setLoadedProfile] = useState<UserProfile | null>(null);
    const [isLoadingProfile, setIsLoadingProfile] = useState(userId !== undefined);
    const [profileLoadFailed, setProfileLoadFailed] = useState(false);

    useEffect(function loadSelectedUser() {
        // Only the User List entry point supplies an account ID.
        if (userId === undefined) {
            return;
        }

        const request = new AbortController();
        // A new selection starts its own loading period.
        setIsLoadingProfile(true);
        // Give each selected profile a fresh start.
        setProfileLoadFailed(false);

        async function loadProfile(id: number) {
            try {
                const profile = await loadUserProfile(id, request.signal);
                if (!request.signal.aborted) {
                    setLoadedProfile(profile);
                }
            } catch (error) {
                // Only show a failure for a request the screen still wants.
                if (!request.signal.aborted && !axios.isCancel(error)) {
                    console.error('Could not load the profile.', error);
                    setProfileLoadFailed(true);
                }
            } finally {
                // A cancelled request cannot end the newer request's loading period.
                if (!request.signal.aborted) {
                    setIsLoadingProfile(false);
                }
            }
        }

        void loadProfile(userId);

        // A request for the previous selection must not update this profile.
        return function cancelProfileRequest() {
            request.abort();
        };
    }, [userId]);

    // Keep a previous account's details off screen while the new one loads.
    let profile: UserProfile | null = null;
    if (loadedProfile?.id === userId) {
        profile = loadedProfile;
    }

    return {
        profile,
        setLoadedProfile,
        isLoadingProfile,
        profileLoadFailed,
    };
}
