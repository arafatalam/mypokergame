import type { KeyboardEvent } from 'react'
import { homeUrl } from '../navigation'
import type { HomeView, NavigationItem } from '../navigation'

type NavigationGroupProps = {
    label: string
    view: HomeView
    items: NavigationItem[]
}

function NavigationGroup(props: NavigationGroupProps) {
    const links = []

    for (const item of props.items) {
        links.push(
            <li key={item.task}>
                <a href={homeUrl(props.view, item.task)}><span>{item.label}</span></a>
            </li>,
        )
    }

    function handleKeyDown(event: KeyboardEvent<HTMLDetailsElement>) {
        if (event.key === 'Escape') {
            event.currentTarget.open = false
            event.currentTarget.querySelector('summary')?.focus()
        }
    }

    return (
        // Native disclosures support keyboard activation; the shared name keeps one group open.
        <details className="home-navigation-group" name="home-task-menu" onKeyDown={handleKeyDown}>
            <summary><span>{props.label}</span></summary>
            <ul className="home-submenu" aria-label={props.label + ' choices'}>{links}</ul>
        </details>
    )
}

export default NavigationGroup
