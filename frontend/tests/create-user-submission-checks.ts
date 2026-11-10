type SubmissionChecks = {
    check: (value: unknown, name: string) => void;
    fill: (id: string, value: string) => Promise<void>;
    submit: (outcome: string) => Promise<void>;
    remount: () => Promise<void>;
    hold: (stage: 'csrf' | 'post' | null) => void;
    release: (outcome: string, reject?: boolean) => void;
    pendingCount: () => number;
    requests: string[];
    lastSubmission: () => FormData | null;
};

// Run the real page and submission hook in StrictMode. Only Axios transport is replaced.
export async function runSubmissionChecks(test: SubmissionChecks) {
    const wait = (ms = 80) => new Promise(resolve => setTimeout(resolve, ms));
    const field = (id: string) => document.getElementById('preview-' + id) as HTMLInputElement;
    const title = () => document.querySelector('.create-user-credential');
    const text = () => document.body.textContent ?? '';
    const controls = () => [...document.querySelectorAll<HTMLInputElement | HTMLSelectElement | HTMLButtonElement>('.create-user-form input, .create-user-form select, .create-user-form button, .player-tab input, .player-tab button')];
    const postCount = () => test.requests.filter(r => r === 'post /api/v1/users').length;
    const csrfCount = () => test.requests.filter(r => r === 'get /sanctum/csrf-cookie').length;
    async function fillForm() {
        await test.fill('first-name', 'Submit'); await test.fill('last-name', 'Check');
        await test.fill('email', 'submit.check@example.com'); await test.fill('phone', '5065550123');
    }
    async function startAnotherForm() {
        const createAnother = [...document.querySelectorAll<HTMLButtonElement>('.create-user-entry-actions button')]
            .find(button => button.textContent === 'Create another')!;
        createAnother.click();
        await wait();
        await fillForm();
    }
    async function pending() {
        for (let i = 0; i < 100 && !test.pendingCount(); i++) await wait();
        test.check(test.pendingCount() === 1, 'exactly one transport request pending');
    }
    async function confirm() {
        document.querySelector('form')!.requestSubmit();
        await wait();
        document.querySelectorAll<HTMLButtonElement>('dialog[open] button')[1].click();
    }
    async function start(stage: 'csrf' | 'post') {
        test.hold(stage);
        await confirm();
        await pending();
    }
    async function changeRole() {
        Object.getOwnPropertyDescriptor(HTMLSelectElement.prototype, 'value')!.set!.call(field('role'), 'manager');
        field('role').dispatchEvent(new Event('change', { bubbles: true })); await wait();
    }
    const errors = ['first-name', 'last-name', 'email', 'phone', 'role', 'photo'];
    await fillForm();
    await test.submit('all-errors');
    const message = (id: string) => document.querySelectorAll('.create-user-error-messages li')[errors.indexOf(id)]?.textContent;
    for (const id of errors) {
        test.check(message(id) === id + ' issue one. ' + id + ' issue two.', 'all server messages rendered for ' + id);
    }
    test.check(field('first-name').value === 'Submit' && field('phone').value === '+1 506-555-0123', 'validation preserves controlled values and formatted phone');
    await changeRole();
    test.check(message('role') === '' && message('email')?.includes('email issue one.'), 'role edit clears only its own feedback');
    await test.submit('success');
    const data = test.lastSubmission()!;
    test.check(['first_name', 'last_name', 'email', 'phone', 'role'].map(key => data.get(key)).join('|') === 'Submit|Check|submit.check@example.com|+1 506-555-0123|manager', 'request contains current controlled values');
    test.check(!data.has('photo'), 'no-photo request omits upload');
    test.check(['first-name', 'last-name', 'email', 'phone'].every(id => field(id).readOnly), 'submitted text remains read-only');
    test.check(field('role').disabled, 'submitted role remains locked');
    await startAnotherForm();
    await test.submit('unexpected');
    test.check(text().includes('An unexpected error occurred. Check whether the account exists before trying again.'), 'non-Axios failure has cautious feedback');
    await test.submit('empty-errors');
    test.check(errors.every(id => message(id) === ''), 'missing validation fields produce empty messages');
    test.check(text().includes('Check the highlighted fields and try again.'), 'missing validation fields retain summary');
    const postsBefore = postCount(), csrfBefore = csrfCount();
    await start('csrf');
    test.check(!title() && text().includes('Creating account…'), 'pending submit announces progress');
    test.check(controls().every(c => c.disabled), 'all form controls disabled during CSRF');
    document.querySelector('form')!.requestSubmit(); await wait();
    test.check(csrfCount() === csrfBefore + 1 && postCount() === postsBefore, 'duplicate submission blocked during CSRF');
    test.hold('post'); test.release('success'); await pending();
    test.check(controls().every(c => c.disabled), 'all form controls stay disabled during POST');
    document.querySelector('form')!.requestSubmit(); await wait();
    test.check(postCount() === postsBefore + 1 && csrfCount() === csrfBefore + 1, 'duplicate submission blocked during POST');
    test.hold(null); test.release('success'); await wait();
    test.check(title() && field('email').readOnly, 'successful POST reveals credentials and locks editing');

    // Closing during CSRF must prevent the POST entirely, including a late rejection.
    for (const reject of [false, true]) {
        if (title()) await startAnotherForm();
        await start('csrf');
        const before = postCount();
        await test.remount();
        test.hold(null); test.release('success', reject); await wait();
        test.check(postCount() === before, 'unmount during CSRF prevents POST, rejection=' + reject);
        test.check(!title() && !text().includes('Creating account…') && !text().includes('Could not confirm'), 'abandoned CSRF cannot replace reopened feedback');
        await fillForm();
    }

    // Old POST success/failure must not interfere with a newer form's pending request.
    for (const reject of [false, true]) {
        if (title()) await startAnotherForm();
        await start('post');
        await test.remount(); await fillForm();
        await confirm(); await wait();
        test.check(test.pendingCount() === 2, 'old and new POSTs are independently pending');
        test.release('success', reject); await wait();
        test.check(!title() && field('email').disabled && text().includes('Creating account…'), 'abandoned POST leaves new submission pending, rejection=' + reject);
        test.hold(null); test.release('success'); await wait();
        test.check(title() && field('email').readOnly, 'new form completes independently of abandoned POST');
    }
    test.check(!test.pendingCount(), 'no unresolved test transport requests');
}
