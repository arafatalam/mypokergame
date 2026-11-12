export function openAnchoredCalendar(picker: HTMLDialogElement, button: HTMLButtonElement) {
    const trigger = button.getBoundingClientRect();
    picker.showModal();
    const { width, height } = picker.getBoundingClientRect();
    const gap = 6;
    const edge = 8;
    const viewport = document.documentElement;
    const left = Math.max(edge, Math.min(trigger.left, viewport.clientWidth - width - edge));
    let top = trigger.bottom + gap;
    // Open above the field when there is more room there.
    if (top + height > viewport.clientHeight - edge && trigger.top > viewport.clientHeight - trigger.bottom) {
        top = trigger.top - height - gap;
    }
    top = Math.max(edge, Math.min(top, viewport.clientHeight - height - edge));
    picker.style.left = left + 'px';
    picker.style.top = top + 'px';
}
