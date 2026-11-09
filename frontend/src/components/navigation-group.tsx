import type { KeyboardEvent, MouseEvent } from 'react'
import type { HomeView, NavigationItem } from '../navigation'

type NavigationGroupProps = {
    label: string
    view: HomeView
    items: NavigationItem[]
    onSelect?: (task: string) => void
}

function NavigationGroup(props: NavigationGroupProps) {
    const links = []

    for (const item of props.items) {
        function handleClick(event: MouseEvent<HTMLButtonElement>) {
            // Tell Home which screen to display, then close its navigation menu.
            if (props.onSelect) {
                props.onSelect(item.task)

                const menu = event.currentTarget.closest('details')
                if (menu) {
                    menu.open = false
                    // Keep keyboard focus on a visible control after hiding the choices.
                    menu.querySelector('summary')?.focus()
                }
            }
        }

        links.push(
            <li key={item.task}>
                <button type="button" onClick={handleClick}>
                    <span>{item.label}</span>
                </button>
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
