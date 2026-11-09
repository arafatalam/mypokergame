type ActiveCreateUserTest = {
    mode: string
    check: (condition: unknown, name: string) => void
    requests: string[]
    setOutcome: (outcome: string) => void
    hold: (stage: 'csrf' | 'post' | null) => void
    pendingCount: () => number
    release: () => void
    lastSubmission: () => FormData | null
}

export async function runActiveCreateUserChecks(test: ActiveCreateUserTest) {
    async function until(condition: () => unknown, name: string) {
        for (let attempt = 0; attempt < 100 && !condition(); attempt++) {
            await new Promise(resolve => setTimeout(resolve, 20))
        }
        test.check(condition(), name)
    }

    const form = () => document.querySelector<HTMLFormElement>('.create-user-form')!
    const dialog = () => document.querySelector<HTMLDialogElement>('.create-user-confirmation-dialog')!
    const ticket = () => document.querySelector<HTMLElement>('.create-user-error-slot')!
    const feedback = () => form().querySelector('button + p')?.textContent ?? ''
    const input = (name: string) => form().elements.namedItem(name) as HTMLInputElement
    const buttons = () => dialog().querySelectorAll('button')
    const text = () => document.querySelector('.create-user-tickets')?.textContent ?? ''
    const controls = () => [...document.querySelectorAll<HTMLInputElement | HTMLButtonElement | HTMLSelectElement>(
        '.create-user-form input, .create-user-form select, .create-user-form button, .player-tab input, .player-tab button',
    )]
    const count = (request: string) => test.requests.filter(value => value === request).length

    async function openConfirmation() {
        form().requestSubmit()
        await until(() => dialog().open, 'confirmation opens')
    }

    async function submit(outcome: string) {
        test.setOutcome(outcome)
        await openConfirmation()
        buttons()[1].click()
        await until(() => !dialog().open && !input('email').disabled, 'form unlocks after ' + outcome)
    }

    function fill(name: string, value: string) {
        const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')!.set!
        setter.call(input(name), value)
        input(name).dispatchEvent(new Event('input', { bubbles: true }))
    }

    await until(() => document.querySelector('summary'), 'Home mounted')
    const users = [...document.querySelectorAll('summary')].find(menu => menu.textContent === 'Users')!
    users.click()
    const createUser = [...users.parentElement!.querySelectorAll('button')].find(button => button.textContent === 'Create User')!
    createUser.click()
    await until(() => form()?.querySelector('select option'), 'active screen loads role options through Users')

    if (test.mode === 'active-submissions') {
        await openConfirmation()
        buttons()[0].click()
        await until(() => !dialog().open, 'cancel closes confirmation')
        test.check(count('get /sanctum/csrf-cookie') === 0 && count('post /api/v1/users') === 0, 'cancel sends neither request')

        await submit('all-errors')
        test.check(!ticket().hidden && ticket().querySelectorAll('li:not([hidden])').length === 6, '422 shows all six field messages')
        fill('first_name', 'Acceptance')
        await until(() => ticket().querySelectorAll('li:not([hidden])').length === 5, 'editing First name clears only its error')
        test.check(ticket().textContent?.includes('email issue one.'), 'unrelated Email error is preserved')
        fill('last_name', 'Check')
        fill('email', 'acceptance.check@example.com')

        const photoInput = document.querySelector<HTMLInputElement>('.player-tab input[type=file]')!
        const canvas = document.createElement('canvas')
        const image = await new Promise<Blob>(resolve => canvas.toBlob(blob => resolve(blob!), 'image/png'))
        const files = new DataTransfer()
        files.items.add(new File([image], 'acceptance.png', { type: 'image/png' }))
        photoInput.files = files.files
        photoInput.dispatchEvent(new Event('change', { bubbles: true }))
        await until(() => text().includes('acceptance.png'), 'selected photo is processed and displayed')

        test.setOutcome('success')
        test.hold('csrf')
        const csrfBefore = count('get /sanctum/csrf-cookie')
        const postsBefore = count('post /api/v1/users')
        await openConfirmation()
        buttons()[1].click()
        buttons()[1].click()
        await until(() => test.pendingCount() === 1 && input('email').disabled, 'one CSRF request starts after repeated confirmation')
        test.check(controls().length === 9 && controls().every(control => control.disabled), 'all nine controls lock during CSRF')
        test.check(feedback() === 'Creating account…', 'progress message appears')
        test.hold('post')
        test.release()
        await until(() => count('post /api/v1/users') === postsBefore + 1 && test.pendingCount() === 1, 'one POST follows CSRF')
        test.check(controls().every(control => control.disabled), 'all controls stay locked during POST')
        form().requestSubmit()
        test.check(!dialog().open && count('get /sanctum/csrf-cookie') === csrfBefore + 1, 'pending submit cannot start another request')
        test.hold(null)
        test.release()
        await until(() => !input('email').disabled && text().includes('TEST123!'), 'success reveals credentials and unlocks controls')
        const upload = test.lastSubmission()?.get('photo')
        test.check(upload instanceof File && upload.type === 'image/webp', 'the submitted photo is the processed WebP')
        test.check(count('post /api/v1/users') === postsBefore + 1, 'only one creation POST was sent')

        for (const outcome of ['401', '419', '403', '500', 'network']) {
            await submit(outcome)
            const expected = {
                '401': 'Your session has expired.',
                '419': 'Your session has expired.',
                '403': 'You do not have permission',
                '500': 'Could not confirm account creation.',
                network: 'Could not confirm account creation.',
            }[outcome]!
            test.check(feedback().startsWith(expected), 'feedback matches ' + outcome)
            test.check(!text().includes('TEST123!') && input('email').value === 'acceptance.check@example.com', 'failure keeps fields and clears old credentials')
        }
        return
    }

    if (test.mode === 'active-errors') {
        await submit('all-errors')
        test.check(!ticket().hidden, 'error ticket is visible')
    } else if (test.mode === 'active-success') {
        await submit('success')
        test.check(text().includes('acceptance.check') && text().includes('TEST123!'), 'both credentials are visible')
    } else {
        await openConfirmation()
    }

    await document.fonts.ready
    await Promise.all([...document.images].map(image => image.decode()))
    const elements = [...document.querySelectorAll<HTMLElement>(
        '.create-user-form-ticket, .player-tab, .create-user-first-sign-in, .create-user-error-slot:not([hidden]), dialog[open]',
    )]
    test.check(elements.every(element => {
        const bounds = element.getBoundingClientRect()
        return bounds.left >= -1 && bounds.right <= document.documentElement.clientWidth + 1 && bounds.width > 0
    }), 'all displayed tickets fit horizontally')
    test.check(document.documentElement.scrollWidth <= innerWidth + 1, 'page has no horizontal overflow')
    if (dialog().open) {
        const bounds = dialog().getBoundingClientRect()
        test.check(bounds.top >= 0 && bounds.bottom <= innerHeight, 'confirmation fits vertically')
        for (const button of buttons()) {
            const bounds = button.getBoundingClientRect()
            test.check(dialog().contains(document.elementFromPoint(bounds.x + bounds.width / 2, bounds.y + bounds.height / 2)), 'confirmation action is reachable')
        }
    }
}
