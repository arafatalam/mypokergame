import { useId, useRef, useState } from 'react';
import type { ChangeEvent, FocusEvent, KeyboardEvent, MouseEvent } from 'react';
import type { PaymentPlayer } from './record-payment-api';

type PaymentPlayerPickerProps = {
    rowClass: string;
    fieldClass: string;
    players: PaymentPlayer[];
    selectedPlayer?: PaymentPlayer;
    disabled: boolean;
    onChange: (id: string) => void;
};

function formatBalance(balance: number) {
    const prefix = balance < 0 ? '-$' : '$';
    return prefix + Math.abs(balance);
}

export default function PaymentPlayerPicker(props: PaymentPlayerPickerProps) {
    const inputId = useId();
    const input = useRef<HTMLInputElement>(null);
    const results = useRef<HTMLDivElement>(null);
    // Keep the search text separate from the player ID used to save the payment.
    const [search, setSearch] = useState<string | null>(null);
    const open = search !== null && !props.disabled;
    const term = search?.trim().toLowerCase() ?? '';
    const selectedName = props.selectedPlayer?.name ?? '';

    function openSearch() {
        if (search === null) {
            setSearch(selectedName);
            input.current?.select();
        }
    }

    function handleSearchChange(event: ChangeEvent<HTMLInputElement>) {
        const value = event.currentTarget.value;
        setSearch(value);
        if (value === '') {
            props.onChange('');
        }
    }

    function handleBlur(event: FocusEvent<HTMLDivElement>) {
        if (!event.currentTarget.contains(event.relatedTarget)) {
            setSearch(null);
        }
    }

    function handleKeyDown(event: KeyboardEvent<HTMLDivElement>) {
        if (event.key === 'Escape' && open) {
            event.preventDefault();
            input.current?.focus();
            setSearch(null);
        } else if (event.key === 'Enter' && event.target === input.current) {
            // Enter in the search field must never submit the payment form.
            event.preventDefault();
        } else if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
            event.preventDefault();
            if (!open) {
                openSearch();
                return;
            }
            const buttons = Array.from(results.current?.querySelectorAll('button') ?? []);
            const current = buttons.findIndex(function isFocused(button) {
                return button === event.target;
            });
            if (event.key === 'ArrowDown') {
                buttons[current + 1]?.focus();
            } else if (current > 0) {
                buttons[current - 1]?.focus();
            } else {
                input.current?.focus();
            }
        }
    }

    function handleSelect(event: MouseEvent<HTMLButtonElement>) {
        props.onChange(event.currentTarget.value);
        input.current?.focus();
        setSearch(null);
    }

    function keepInputFocused(event: MouseEvent<HTMLButtonElement>) {
        // Keep the list open until the option's click selects the player.
        event.preventDefault();
    }

    const playerOptions = [];
    if (open) {
        for (const player of props.players) {
            if (player.name.toLowerCase().includes(term)) {
                playerOptions.push(
                    <button key={player.id} type="button" value={player.id} onMouseDown={keepInputFocused} onClick={handleSelect}
                        className="flex w-full items-center justify-between gap-2 px-3 py-2 text-left hover:bg-amber-200 focus-visible:bg-amber-200">
                        <span className="min-w-0 wrap-anywhere">{player.name}</span>
                        <span className="shrink-0 whitespace-nowrap text-right tabular-nums">
                            {formatBalance(player.balance)}
                        </span>
                    </button>,
                );
            }
        }
    }

    return (
        <div className={props.rowClass}>
            <label htmlFor={inputId}>Player</label>
            <div className="relative min-w-0" onBlur={handleBlur} onKeyDown={handleKeyDown}>
                <div className={props.fieldClass + ' flex items-center gap-2 focus-within:outline focus-within:outline-2 has-disabled:opacity-60'}>
                    <input ref={input} id={inputId} type="text" autoComplete="off" className="min-w-0 flex-1 bg-transparent outline-none"
                        placeholder="Search players" value={search ?? selectedName} disabled={props.disabled}
                        onFocus={openSearch} onClick={openSearch} onChange={handleSearchChange} />
                    {!open && props.selectedPlayer && (
                        <span className="shrink-0 whitespace-nowrap text-right tabular-nums">
                            {formatBalance(props.selectedPlayer.balance)}
                        </span>
                    )}
                </div>
                {open && (
                    <div ref={results} className="absolute inset-x-0 top-full z-20 mt-1 max-h-48 overflow-y-auto rounded-lg border border-current bg-[#fff3d8] py-1 shadow-lg">
                        {playerOptions.length === 0 && <p className="px-3 py-2 text-sm">No matching players.</p>}
                        {playerOptions}
                    </div>
                )}
            </div>
        </div>
    );
}
