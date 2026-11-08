import React from 'react'
import { createRoot } from 'react-dom/client'
import axios, { AxiosError } from 'axios'
import App from '../src/App'
import { runPhotoChecks } from './create-user-photo-checks'
import { runSubmissionChecks } from './create-user-submission-checks'
import '../src/index.css'

// Test-only transport. The real adapter is never called, including unexpected URLs.
let outcome = 'errors'
let lastSubmission: FormData | null = null
let heldStage: 'csrf' | 'post' | null = null
const pendingSubmissions: { resolve: () => void; reject: () => void }[] = []
const requests: string[] = []
const mode = new URLSearchParams(location.search).get('mode') ?? 'blank'
let roleRequestMode = mode === 'roles' ? 'deferred' : 'normal'
type TestRoleOption = { value: string; label: string }
const pendingRoles: { resolve: (roles: TestRoleOption[]) => void; reject: () => void }[] = []
const allowedRoles = [{value:'admin',label:'Admin'}, {value:'manager',label:'Manager'}, {value:'player',label:'Player'}]
axios.defaults.adapter = async function (config) {
    requests.push(config.method + ' ' + config.url)
    const response = { config, status: 200, statusText: 'OK', headers: {}, data: {} as object }
    if ((heldStage === 'csrf' && config.url === '/sanctum/csrf-cookie') || (heldStage === 'post' && config.url === '/api/v1/users' && config.method === 'post')) {
        await new Promise<void>(function (resolve, reject) {
            pendingSubmissions.push({ resolve, reject() { reject(new AxiosError('Simulated delayed failure', 'ERR_NETWORK', config)) } })
        })
    }
    if (config.url === '/api/v1/user' || config.url === '/sanctum/csrf-cookie') return response
    if (config.url === '/api/v1/users/create-options') {
        if (roleRequestMode === 'deferred') {
            return new Promise(function (resolve, reject) {
                pendingRoles.push({
                    resolve(roles) { resolve({ ...response, data: { roles } }) },
                    reject() { reject(new AxiosError('Simulated role failure','ERR_NETWORK',config)) },
                })
            })
        }
        if (roleRequestMode === 'failure') throw new AxiosError('Simulated role failure','ERR_NETWORK',config)
        response.data = { roles: allowedRoles }
        return response
    }
    if (config.url !== '/api/v1/users' || config.method !== 'post') throw Error('Unexpected test request')
    lastSubmission = config.data as FormData
    if (outcome === 'unexpected') throw Error('Simulated unexpected failure')
    if (outcome === 'success') return { ...response, status: 201, data: {username:'acceptance.check',generated_password:'TEST123!'} }
    if (outcome === 'network') throw new AxiosError('Simulated connection loss', 'ERR_NETWORK', config)
    response.status = Number(outcome) || 422
    response.data = {message:'The selected role is invalid. (and 1 more error)',errors:{role:['The selected role is invalid.'],photo:['The photo field must not be greater than 2048 kilobytes.']}}
    if (outcome === 'all-errors') {
        const errors: Record<string, string[]> = {}
        for (const [key, id] of [['first_name', 'first-name'], ['last_name', 'last-name'], ['email', 'email'], ['phone', 'phone'], ['role', 'role'], ['photo', 'photo']]) errors[key] = [id + ' issue one.', id + ' issue two.']
        response.data = { errors }
    }
    if (outcome === 'empty-errors') response.data = {}
    throw new AxiosError('Simulated API response', 'ERR_BAD_RESPONSE', config, undefined, response)
}

const root = createRoot(document.getElementById('root')!)
root.render(<React.StrictMode><App /></React.StrictMode>)

const delay = (ms = 60) => new Promise(resolve => setTimeout(resolve, ms))
const checks: string[] = []
function check(value: unknown, name: string) { if (!value) throw Error(name); checks.push(name) }
function text() { return document.body.textContent ?? '' }
function field(id: string) { return document.getElementById(id) as HTMLInputElement }
async function fill(id: string, value: string) {
    // Exercise React's input event and controlled state through the real input.
    Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')!.set!.call(field(id),value)
    field(id).dispatchEvent(new Event('input',{bubbles:true}))
    await delay()
}
async function submit(next: string) {
    outcome = next
    document.querySelector('form')!.requestSubmit()
    await delay()
    check(!document.querySelector<HTMLButtonElement>('button[type=submit]')!.disabled,'submit reenabled after '+next)
}
async function run() {
    for(let i=0;i<100&&!document.querySelector('#email');i++) await delay()
    check(!!document.querySelector('#email'),'Create User mounted')
    if (mode === 'submissions') {
        let generation = 0
        await runSubmissionChecks({
            check, fill, submit, requests,
            lastSubmission() { return lastSubmission },
            hold(stage) { heldStage = stage },
            pendingCount() { return pendingSubmissions.length },
            release(next, reject = false) {
                outcome = next
                const request = pendingSubmissions.shift()!
                if (reject) request.reject()
                else request.resolve()
            },
            async remount() {
                generation += 1
                root.render(<React.StrictMode><App key={'reopened-submission-' + generation} /></React.StrictMode>)
                for (let i = 0; i < 100; i++) {
                    await delay()
                    if (document.querySelector('#email') && !field('role').disabled && field('email').value === '') return
                }
                throw Error('Reopened submission form did not become ready')
            },
        })
    }
    if (mode === 'photos') {
        await runPhotoChecks({
            check, fill, submit, requests,
            lastSubmission() { return lastSubmission },
            async remount() {
                root.render(<React.StrictMode><App key="reopened-photo-form" /></React.StrictMode>)
                for (let i = 0; i < 100; i++) {
                    await delay()
                    if (document.querySelector('#email') && !field('role').disabled && field('email').value === '') return
                }
                throw Error('Reopened form did not become ready')
            },
        })
    }
    if(mode==='roles') {
        check(field('role').disabled,'role disabled while loading')
        check(document.querySelector('#roles-message')?.textContent?.includes('Loading roles'),'loading feedback visible')
        await fill('first-name','Role'); await fill('last-name','Check'); await fill('email','role.check@example.com')
        document.querySelector('form')!.requestSubmit(); await delay()
        check(!requests.some(r=>r==='get /sanctum/csrf-cookie'||r==='post /api/v1/users'),'loading blocks submission requests')
        const initialRequests=requests.filter(r=>r.includes('create-options')).length
        check(pendingRoles.length>0,'role request pending')
        pendingRoles.at(-1)!.resolve(allowedRoles); await delay()
        for(const request of pendingRoles.slice(0,-1)) request.resolve([{value:'invented',label:'Stale choice'}])
        await delay()
        check(!field('role').disabled&&field('role').value==='player','Player default after role success')
        check(!text().includes('Stale choice'),'StrictMode cleanup ignores stale successful response')
        check(document.querySelector('#roles-message')?.textContent?.trim()==='','loading feedback cleared')
        Object.getOwnPropertyDescriptor(HTMLSelectElement.prototype,'value')!.set!.call(field('role'),'manager')
        field('role').dispatchEvent(new Event('change',{bubbles:true})); await delay()
        await fill('email','role.changed@example.com')
        check(field('role').value==='manager','editing Email preserves Manager')
        check(requests.filter(r=>r.includes('create-options')).length===initialRequests,'input edits do not refetch roles')
        roleRequestMode='failure'; root.render(<React.StrictMode><App key="failed-roles" /></React.StrictMode>); await delay(180)
        check(field('role').disabled,'role disabled after failure')
        check(text().includes('Could not load roles. Please reopen Create User to try again.'),'role failure feedback visible')
        roleRequestMode='deferred'; root.render(<React.StrictMode><App key="pending-roles" /></React.StrictMode>); await delay(180)
        const abandoned=pendingRoles.slice(initialRequests)
        roleRequestMode='normal'; root.render(<React.StrictMode><App key="reopened" /></React.StrictMode>); await delay(180)
        for(const request of abandoned) request.reject()
        await delay()
        check(!field('role').disabled&&field('role').value==='player','reopen recovers Player options')
        check(document.querySelector('#roles-message')?.textContent?.trim()==='','late rejected request cannot replace reopened feedback')
        check(!requests.some(r=>r==='post /api/v1/users'),'role checks create no account')
    }
    for(let i=0;i<100&&document.querySelector<HTMLSelectElement>('#role')?.disabled;i++) await delay()
    if(mode!=='blank'&&mode!=='roles'&&mode!=='photos'&&mode!=='submissions') {
        await fill('first-name','Acceptance'); await fill('last-name','Check'); await fill('email','acceptance.check@example.com')
        await submit('errors')
        check(field('role').getAttribute('aria-invalid')==='true','role marked invalid')
        check(document.querySelector('#role-error')?.textContent==='The selected role is invalid.','role error visible')
        check(document.querySelector('#photo-error')?.textContent==='The photo field must not be greater than 2048 kilobytes.','photo error visible')
        check(field('first-name').value==='Acceptance'&&field('email').value==='acceptance.check@example.com','values retained after 422')
        check(text().includes('Check the highlighted fields and try again.'),'422 summary visible')
        // Use the real change handler to clear feedback before exercising the next response.
        await fill('first-name','Acceptance Next')
        check(document.querySelector('#role-error')?.textContent==='','editing clears field errors')
        await submit('success')
        check(text().includes('acceptance.check')&&text().includes('TEST123!'),'successful retry shows credentials')
        if(mode==='errors') {
            await submit('errors')
            check(!document.querySelector('#created-account-title'),'new failed submit clears old credentials')
        } else {
            for(const status of ['401','419','403','500','network']) {
                await submit(status)
                const expected=status==='401'||status==='419'?'Your session has expired. Sign in again before creating an account.':status==='403'?'You do not have permission to create this account.':'Could not confirm account creation. Check your connection and whether the account exists before trying again.'
                check(text().includes(expected),status+' feedback visible')
                check(!document.querySelector('#created-account-title'),status+' hides stale credentials')
                check(field('email').value==='acceptance.check@example.com',status+' retains form')
            }
            await submit('success')
        }
    }
    await document.fonts.ready; await Promise.all([...document.images].map(image=>image.decode().catch(()=>{}))); await delay(120)
    const elements=[...document.querySelectorAll<HTMLElement>('input:not([type=file]),select,.create-account-submit,#role-error,#photo-error,#created-account-title')]
    const bounds=elements.map(el=>({id:el.id||el.className,x:Math.round(el.getBoundingClientRect().left),right:Math.round(el.getBoundingClientRect().right),bottom:Math.round(el.getBoundingClientRect().bottom)}))
    const horizontal= document.documentElement.scrollWidth>innerWidth+1 || bounds.some(b=>b.x<0||b.right>innerWidth+1)
    const clipped=elements.filter(el=>{const s=getComputedStyle(el);return ['hidden','clip'].includes(s.overflowY)&&el.scrollHeight>el.clientHeight+1}).map(el=>el.id)
    const account=document.querySelector('.home-account-navigation')!.getBoundingClientRect()
    const overlap=elements.filter(el=>{const r=el.getBoundingClientRect();return r.width&&r.height&&r.left<account.right&&r.right>account.left&&r.top<account.bottom&&r.bottom>account.top}).map(el=>el.id||'submit')
    const coveredLabels=[...document.querySelectorAll('label[for]')].filter(label=>{
        const r=label.getBoundingClientRect(); const x=r.left+2,y=r.top+r.height/2;
        if(x<0||y<0||x>=innerWidth||y>=innerHeight)return false;
        // The decorative skin ignores pointer events; test its painted path directly.
        const skin=document.querySelector<SVGPathElement>('.create-account-photo-ticket clipPath path');
        const matrix=skin?.getScreenCTM();
        return !!skin&&!!matrix&&skin.isPointInFill(new DOMPoint(x,y).matrixTransform(matrix.inverse()));
    }).map(label=>label.getAttribute('for'))
    parent.postMessage({kind:'acceptance',viewport:innerWidth+'x'+innerHeight,mode,passed:checks.length,horizontalOverflow:horizontal,documentHeight:document.documentElement.scrollHeight,clipped,overlap,coveredLabels,brokenImages:[...document.images].filter(i=>!i.naturalWidth).length,requests:requests.length},location.origin)
}
run().catch(error=>parent.postMessage({kind:'acceptance',error:String(error),passed:checks.length},location.origin))
