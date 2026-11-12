import { useEffect, useState } from 'react';
import { loadHomeSummary } from './load-home-summary';
import type { HomeSummary } from './load-home-summary';

export function useHomeSummary(canViewSummary: boolean) {
    const [summary, setSummary] = useState<HomeSummary | null>(null);
    const [hasFailed, setHasFailed] = useState(false);
    const [attempt, setAttempt] = useState(0);

    useEffect(function fetchSummary() {
        if (!canViewSummary) {
            return;
        }

        const controller = new AbortController();

        async function requestSummary() {
            try {
                const data = await loadHomeSummary(controller.signal);
                if (!controller.signal.aborted) {
                    setSummary(data);
                }
            } catch {
                if (!controller.signal.aborted) {
                    setHasFailed(true);
                }
            }
        }

        void requestSummary();
        return function cancelSummary() {
            controller.abort();
        };
    }, [attempt, canViewSummary]);

    function handleRetry() {
        setHasFailed(false);
        setAttempt(attempt + 1);
    }

    return { summary, hasFailed, handleRetry };
}
