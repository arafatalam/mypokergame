export type HomeView = 'home' | 'users' | 'games' | 'players' | 'records' | 'my-account';

export type NavigationItem = {
    task: string;
    label: string;
};

// Use the existing frontend entry URL so refresh and normal links work on Laravel too.
export function homeUrl(view: HomeView, task = ''): string {
    if (view === 'home') {
        return '/home';
    }

    let url = '/home?view=' + encodeURIComponent(view);

    if (task !== '') {
        url += '&task=' + encodeURIComponent(task);
    }

    return url;
}

export function readHomeView(): HomeView {
    const view = new URLSearchParams(window.location.search).get('view');

    if (view === 'users' || view === 'games' || view === 'players' || view === 'records' || view === 'my-account') {
        return view;
    }

    return 'home';
}
