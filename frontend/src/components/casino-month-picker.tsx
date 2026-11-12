import { useRef, useState } from 'react';
import type { MouseEvent } from 'react';
import './casino-calendar.css';
import { openAnchoredCalendar } from './open-anchored-calendar';

type CasinoMonthPickerProps = {
    label: string;
    value: string;
    maxMonth: string;
    onChange: (month: string) => void;
};

const monthLabel = new Intl.DateTimeFormat('en-CA', { month: 'short', timeZone: 'UTC' });

export default function CasinoMonthPicker(props: CasinoMonthPickerProps) {
    const dialog = useRef<HTMLDialogElement>(null);
    const maxYear = Number(props.maxMonth.slice(0, 4));
    const [year, setYear] = useState(maxYear);

    function handleOpen(event: MouseEvent<HTMLButtonElement>) {
        const picker = dialog.current;
        if (!picker) {
            return;
        }

        setYear(Number((props.value || props.maxMonth).slice(0, 4)));
        openAnchoredCalendar(picker, event.currentTarget);
    }

    function handleClose() {
        dialog.current?.close();
    }

    function handleBackdrop(event: MouseEvent<HTMLDialogElement>) {
        if (event.target === event.currentTarget) {
            handleClose();
        }
    }

    function handlePreviousYear() {
        setYear(year - 1);
    }

    function handleNextYear() {
        setYear(year + 1);
    }

    function handleChooseMonth(event: MouseEvent<HTMLButtonElement>) {
        props.onChange(event.currentTarget.value);
        handleClose();
    }

    const months = [];
    for (let number = 1; number <= 12; number++) {
        const value = String(year).padStart(4, '0') + '-' + String(number).padStart(2, '0');
        months.push(
            <button key={value} type="button" value={value}
                className={value === props.value ? 'casino-calendar-selected' : undefined}
                disabled={value > props.maxMonth} onClick={handleChooseMonth}>
                {monthLabel.format(new Date(value + '-01T00:00:00Z'))}
            </button>,
        );
    }

    return (
        <>
            <span>{props.label}</span>
            <button type="button" className="casino-calendar-trigger casino-month-trigger"
                aria-label={props.label + (props.value ? ': ' + props.value : '')} onClick={handleOpen}>
                <span>{props.value || 'Choose'}</span>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                    <rect x="4" y="6" width="16" height="14" rx="2" />
                    <path d="M8 4v4m8-4v4M4 10h16" />
                </svg>
            </button>
            <dialog ref={dialog} className="casino-calendar-dialog casino-calendar-anchored" onClick={handleBackdrop}>
                <div className="casino-calendar-panel">
                    <h3>{props.label}</h3>
                    <div className="casino-calendar-month">
                        <button type="button" title="Previous year" disabled={year <= 1} onClick={handlePreviousYear}>‹</button>
                        <strong>{year}</strong>
                        <button type="button" title="Next year" disabled={year >= maxYear} onClick={handleNextYear}>›</button>
                    </div>
                    <div className="casino-calendar-days casino-calendar-months">{months}</div>
                    <div className="casino-calendar-actions">
                        <button type="button" value="" disabled={!props.value} onClick={handleChooseMonth}>Clear month</button>
                        <button type="button" onClick={handleClose}>Close</button>
                    </div>
                </div>
            </dialog>
        </>
    );
}
