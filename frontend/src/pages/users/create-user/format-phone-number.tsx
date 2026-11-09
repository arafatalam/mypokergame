export function formatPhoneNumber(text: string): string {
    let localNumber = text

    // Remove the prefix before counting the local digits.
    if (localNumber.startsWith('+1')) {
        localNumber = localNumber.slice(2)
    }

    const digits = localNumber.replace(/\D/g, '').slice(0, 10)

    // An optional phone field must stay empty when cleared.
    if (digits.length === 0) {
        return ''
    }

    let formatted = digits.slice(0, 3)

    // Add a dash only when the next group has digits.
    if (digits.length > 3) {
        formatted = formatted + '-' + digits.slice(3, 6)
    }

    if (digits.length > 6) {
        formatted = formatted + '-' + digits.slice(6)
    }

    return '+1 ' + formatted
}