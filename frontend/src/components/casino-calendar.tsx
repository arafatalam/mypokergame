import { useRef, useState } from 'react';
import type { MouseEvent } from 'react';
import './casino-calendar.css';
import { openAnchoredCalendar } from './open-anchored-calendar';

type CasinoCalendarProps = {
    label: string;
    value: string;
    onChange: (date: string) => void;
    maxDate?: string;
    disabled?: boolean;
    clearable?: boolean;
    anchored?: boolean;
};

const roomDate = new Intl.DateTimeFormat('sv-SE', { timeZone: 'America/Moncton' });
const monthLabel = new Intl.DateTimeFormat('en-CA', { month: 'long', year: 'numeric', timeZone: 'UTC' });
const dayLabel = new Intl.DateTimeFormat('en-CA', { dateStyle: 'full', timeZone: 'UTC' });
const weekdays = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];

export default function CasinoCalendar(props: CasinoCalendarProps) {
    const dialog = useRef<HTMLDialogElement>(null);
    const today = roomDate.format(new Date());
    const maxDate = props.maxDate ?? today;
    const [month, setMonth] = useState(maxDate.slice(0, 7));
    const monthStart = new Date(month + '-01T00:00:00Z');

    function shiftedMonth(offset: number) {
        const date = new Date(monthStart);
        date.setUTCMonth(date.getUTCMonth() + offset);
        return date.toISOString().slice(0, 7);
    }

    function handleOpen(event: MouseEvent<HTMLButtonElement>) {
        // Start at the selected date, or at the latest available month.
        setMonth((props.value || maxDate).slice(0, 7));
        const picker = dialog.current;
        if (picker && props.anchored) {
            openAnchoredCalendar(picker, event.currentTarget);
        } else {
            picker?.showModal();
        }
    }

    function handleClose() {
        dialog.current?.close();
    }

    function handleBackdrop(event: MouseEvent<HTMLDialogElement>) {
        if (event.target === event.currentTarget) {
            handleClose();
        }
    }

    function handlePreviousMonth() {
        setMonth(shiftedMonth(-1));
    }

    function handleNextMonth() {
        setMonth(shiftedMonth(1));
    }

    function handleChooseDay(event: MouseEvent<HTMLButtonElement>) {
        const date = event.currentTarget.value;
        if (date <= maxDate) {
            props.onChange(date);
            handleClose();
        }
    }

    const days = [];
    for (let blank = 0; blank < monthStart.getUTCDay(); blank++) {
        days.push(<span key={'blank-' + blank} />);
    }
    const date = new Date(monthStart);
    while (date.getUTCMonth() === monthStart.getUTCMonth()) {
        const value = date.toISOString().slice(0, 10);
        days.push(
            <button key={value} type="button" value={value} title={dayLabel.format(date)}
                className={value === props.value ? 'casino-calendar-selected' : undefined}
                disabled={value > maxDate} onClick={handleChooseDay}>
                {date.getUTCDate()}
            </button>,
        );
        date.setUTCDate(date.getUTCDate() + 1);
    }

    return (
        <>
            <button type="button" className="casino-calendar-trigger" disabled={props.disabled}
                aria-label={props.label + (props.value ? ': ' + props.value : '')}
                onClick={handleOpen}>
                <span>{props.value || 'Choose date'}</span>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                    <rect x="4" y="6" width="16" height="14" rx="2" />
                    <path d="M8 4v4m8-4v4M4 10h16" />
                </svg>
            </button>
            <dialog ref={dialog} className={props.anchored ? "casino-calendar-dialog casino-calendar-anchored" : "casino-calendar-dialog"} onClick={handleBackdrop}>
                <div className="casino-calendar-panel">
                    <h3>{props.label}</h3>
                    <div className="casino-calendar-month">
                        <button type="button" title="Previous month" disabled={month <= '0001-01'} onClick={handlePreviousMonth}>‹</button>
                        <strong>{monthLabel.format(monthStart)}</strong>
                        <button type="button" title="Next month" disabled={month >= maxDate.slice(0, 7)} onClick={handleNextMonth}>›</button>
                    </div>
                    <div className="casino-calendar-days">
                        {weekdays.map(function weekday(day) { return <span key={day}>{day}</span>; })}
                        {days}
                    </div>
                    <div className="casino-calendar-actions">
                        {props.clearable && <button type="button" value="" disabled={!props.value} onClick={handleChooseDay}>Clear date</button>}
                        <button type="button" onClick={handleClose}>Close</button>
                    </div>
                </div>
            </dialog>
        </>
    );
}
