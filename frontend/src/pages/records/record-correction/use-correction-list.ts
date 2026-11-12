import { useEffect, useState } from 'react';

export function useCorrectionList<Query extends { page: number }, Result>(
    initialQuery: Query,
    load: (query: Query, signal: AbortSignal) => Promise<Result>,
) {
    const [query, setQuery] = useState(initialQuery);
    const [result, setResult] = useState<Result | null>(null);
    const [successfulQuery, setSuccessfulQuery] = useState<Query | null>(null);
    const [settledQuery, setSettledQuery] = useState<Query | null>(null);

    useEffect(function fetchPage() {
        const request = new AbortController();

        async function fetchResult() {
            try {
                const response = await load(query, request.signal);
                if (!request.signal.aborted) {
                    setResult(response);
                    setSuccessfulQuery(query);
                }
            } catch {
                // Keep the last successful rows visible on a failed request.
            } finally {
                if (!request.signal.aborted) {
                    setSettledQuery(query);
                }
            }
        }

        void fetchResult();
        return function cancelRequest() {
            request.abort();
        };
    }, [load, query]);

    const loading = settledQuery !== query;
    const failed = !loading && successfulQuery !== query;

    function goToPage(page: number) {
        setQuery({ ...query, page });
    }

    function replaceFilters(nextQuery: Query) {
        // Clear rows from the old filter, even when returning to it before a request settles.
        setResult(null);
        setQuery(nextQuery);
    }

    function retry() {
        goToPage(query.page);
    }

    return { query, setQuery, result, loading, failed, goToPage, replaceFilters, retry };
}
