type PhotoChecks = {
    check: (value: unknown, name: string) => void
    fill: (id: string, value: string) => Promise<void>
    submit: (outcome: string) => Promise<void>
    remount: () => Promise<void>
    requests: string[]
    lastSubmission: () => FormData | null
}

// Exercise the real hook in React StrictMode, using native image decoding/encoding.
// Only the API transport and deliberately delayed encoder callbacks are simulated.
export async function runPhotoChecks(test: PhotoChecks) {
    const wait = (ms = 80) => new Promise(resolve => setTimeout(resolve, ms))
    const input = () => document.querySelector<HTMLInputElement>('input[type=file]')!
    const portrait = () => document.querySelector<HTMLImageElement>('.player-tab img')!
    const button = (label: string) => [...document.querySelectorAll('button')].find(b => b.textContent?.trim() === label)!
    const submitButton = () => document.querySelector<HTMLButtonElement>('button[type=submit]')!
    const message = () => document.querySelector('.player-tab section > p')!.textContent ?? ''
    const sample = portrait().src
    const nativeEncode = HTMLCanvasElement.prototype.toBlob
    const nativeRevoke = URL.revokeObjectURL
    const revoked: string[] = []
    const pending: { canvas: HTMLCanvasElement; callback: BlobCallback }[] = []
    URL.revokeObjectURL = function (url) { revoked.push(url); nativeRevoke.call(URL, url) }

    const canvas = document.createElement('canvas')
    canvas.width = 1600; canvas.height = 800
    canvas.getContext('2d')!.fillRect(0, 0, canvas.width, canvas.height)
    const original = await new Promise<Blob>(resolve => nativeEncode.call(canvas, blob => resolve(blob!), 'image/png'))
    const file = new File([original], 'original.png', { type: 'image/png' })
    async function choose(next: File | null) {
        const transfer = new DataTransfer()
        if (next) transfer.items.add(next)
        input().files = transfer.files
        input().dispatchEvent(new Event('change', { bubbles: true }))
        await wait()
    }
    async function ready() {
        for (let i = 0; i < 100 && !message().includes('original.png'); i++) await wait()
        test.check(message().includes('original.png'), 'photo accepted')
        await portrait().decode()
    }
    async function pendingCount(count: number) {
        for (let i = 0; i < 100 && pending.length < count; i++) await wait()
        test.check(pending.length === count, 'native decode reached delayed encoder ' + count)
    }
    function delayEncoder() {
        HTMLCanvasElement.prototype.toBlob = function (callback) { pending.push({ canvas: this, callback }) }
    }
    async function finish(index: number) {
        const item = pending[index]
        const blob = await new Promise<Blob | null>(resolve => nativeEncode.call(item.canvas, resolve, 'image/webp', 0.8))
        item.callback(blob)
        await wait()
    }

    try {
        test.check(button('Clear photo').disabled, 'Clear initially disabled')
        await test.fill('first-name', 'Photo'); await test.fill('last-name', 'Check'); await test.fill('email', 'photo.check@example.com')
        await test.submit('success')
        test.check(document.querySelector('.create-user-credential'), 'credentials visible before photo change')
        await choose(file); await ready()
        test.check(!document.querySelector('.create-user-credential'), 'accepted photo clears old credentials')
        test.check(portrait().naturalWidth === 1200 && portrait().naturalHeight === 600, 'native compression preserves proportions at 1200 pixels')
        test.check(portrait().alt === 'Selected profile photo', 'selected portrait description')
        test.check(input().value === '', 'native picker resets for same-file reselection')
        const first = portrait().src
        await choose(null)
        test.check(portrait().src === first, 'picker cancellation retains preview')
        await choose(new File(['gif'], 'wrong.gif', { type: 'image/gif' }))
        test.check(portrait().src === first && message().includes('Choose a JPG'), 'invalid replacement retains accepted preview')
        await choose(new File(['corrupt'], 'corrupt.png', { type: 'image/png' }))
        test.check(portrait().src === first && message().includes('could not be read'), 'decode failure retains accepted preview')
        await choose(file); await ready()
        test.check(revoked.includes(first), 'replacement releases previous object URL')
        const accepted = portrait().src
        await test.submit('success')
        const sent = test.lastSubmission()!.get('photo') as File
        test.check(sent instanceof File && sent.name === 'profile-photo.webp' && sent.type === 'image/webp', 'submission receives compressed WebP File')
        const previewBytes = await (await fetch(accepted)).arrayBuffer()
        test.check(new Uint8Array(previewBytes).toString() === new Uint8Array(await sent.arrayBuffer()).toString(), 'submitted File bytes match preview')

        delayEncoder()
        await choose(file); await pendingCount(1)
        test.check(submitButton().disabled && !button('Clear photo').disabled, 'compression blocks submit and keeps Clear available')
        const requestsBefore = test.requests.length
        document.querySelector('form')!.requestSubmit(); await wait()
        test.check(test.requests.length === requestsBefore, 'submit handler sends no requests during compression')
        button('Clear photo').click(); await wait()
        test.check(portrait().src === sample && button('Clear photo').disabled, 'Clear restores sample during pending compression')
        test.check(!document.querySelector('.create-user-credential'), 'Clear removes old credentials')
        test.check(revoked.includes(accepted), 'Clear releases accepted preview URL')
        await finish(0)
        test.check(portrait().src === sample && message().includes('Original photo up to 10 MB'), 'cleared encoder result stays ignored')

        await choose(file); await pendingCount(2)
        await choose(file); await pendingCount(3)
        await finish(2); await ready()
        const newest = portrait().src
        await finish(1)
        test.check(portrait().src === newest, 'newest encoder result wins in React')
        await choose(file); await pendingCount(4)
        await choose(new File(['gif'], 'wrong.gif', { type: 'image/gif' }))
        await finish(3)
        test.check(portrait().src === newest && message().includes('Choose a JPG'), 'invalid newer selection invalidates old encoder')

        await choose(file); await pendingCount(5)
        await test.remount()
        test.check(revoked.includes(newest), 'unmount releases accepted preview')
        await finish(4)
        test.check(portrait().src === sample && message().includes('Original photo up to 10 MB'), 'unmounted encoder cannot update reopened form')
        HTMLCanvasElement.prototype.toBlob = nativeEncode
        await choose(file); await ready()
        test.check(!submitButton().disabled, 'same file works after reopening')
        button('Clear photo').click(); await wait()
        await test.fill('first-name', 'No'); await test.fill('last-name', 'Photo'); await test.fill('email', 'no.photo@example.com')
        await test.submit('success')
        test.check(!test.lastSubmission()!.has('photo'), 'submission after Clear omits photo')
        test.check(document.querySelector('.create-user-credential'), 'submission after Clear succeeds')
        test.check(revoked.length === new Set(revoked).size, 'each accepted preview URL released once')
    } finally {
        HTMLCanvasElement.prototype.toBlob = nativeEncode
        URL.revokeObjectURL = nativeRevoke
    }
}
