const { test } = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs')
const vm = require('node:vm')
const { File } = require('node:buffer')

// Execute the application's handlers unchanged except for their TypeScript types.
// Browser doubles make late decoding/encoding and encoder failures deterministic.
const source = fs.readFileSync(require('node:path').join(__dirname, '../src/pages/users/use-profile-photo.ts'), 'utf8')
const pageSource = fs.readFileSync(require('node:path').join(__dirname, '../src/pages/users/create-user.tsx'), 'utf8')
const submissionSource = fs.readFileSync(require('node:path').join(__dirname, '../src/pages/users/use-create-user-submission.ts'), 'utf8')
function section(start, end, sourceText = source) {
    assert.ok(sourceText.includes(start) && sourceText.includes(end), 'handler boundaries exist')
    return sourceText.slice(sourceText.indexOf(start), sourceText.indexOf(end))
        .replaceAll(': ChangeEvent<HTMLInputElement>', '')
        .replaceAll(': SubmitEvent<HTMLFormElement>', '')
        .replaceAll(': Blob | null', '')
        .replaceAll(': CreateUserDetails', '')
        .replaceAll(': boolean', '')
}
function harness(options = {}) {
    const pending = []
    const decoded = []
    const canvases = []
    const urls = []
    const calls = []
    const c = {
        File, Blob, console: { log() {} }, samplePortrait: 'sample',
        photo: null, photoPreview: 'sample', photoMessage: '', isCheckingPhoto: false,
        isSubmitting: false, roleChoices: { isLoadingRoles: false, roles: [{}] },
        firstName: 'Test', lastName: 'Photo', email: 'test@example.com', phone: '', selectedRole: 'player',
        photoCheckRef: { current: 0 }, submissionRef: { current: 0 }, photoInputRef: { current: { value: 'old' } },
        clearSubmissionFeedback() { calls.push('clearFeedback') },
        FormData,
        axios: { async get() { calls.push('csrf') }, async post(url, data) { calls.push(data); return { data: { username: 'test.photo', generated_password: 'test-only' } } }, isAxiosError() { return false } },
        URL: { createObjectURL(file) { urls.push(file); return 'blob:' + urls.length } },
        async createImageBitmap() {
            if (options.decodeError) throw Error('decode failed')
            let resolve
            const wait = new Promise(r => { resolve = r })
            const bitmap = { width: options.width ?? 3024, height: options.height ?? 4032, closed: false, close() { this.closed = true } }
            decoded.push({ bitmap, resolve })
            if (options.delayDecode) await wait
            return bitmap
        },
        document: { createElement(tag) {
            assert.equal(tag, 'canvas')
            const canvas = {
                getContext(type) { assert.equal(type, '2d'); return options.noContext ? null : { drawImage(...args) { if (options.drawError) throw Error('draw failed'); canvas.draw = args } } },
                toBlob(callback, type, quality) { canvas.type = type; canvas.quality = quality; if (options.encodeThrow) throw Error('encode failed'); pending.push(callback) },
            }
            canvases.push(canvas)
            return canvas
        } },
    }
    for (const name of ['Photo', 'PhotoPreview', 'PhotoMessage', 'IsCheckingPhoto', 'IsSubmitting', 'SubmitMessage', 'CreatedAccount', 'FieldErrors']) {
        const key = name[0].toLowerCase() + name.slice(1)
        c['set' + name] = value => { c[key] = value }
    }
    c.profilePhoto = c
    c.submission = c
    vm.createContext(c)
    vm.runInContext(section('    async function handlePhotoChange', '    return {') + '\n' + section('    async function submitAccount', '    return {', submissionSource) + '\n' + section('    async function handleSubmit', '    // Show credentials only', pageSource), c)
    return {
        c, pending, decoded, canvases, urls, calls,
        choose(type = 'image/jpeg', size = 100) {
            const input = { value: 'chosen', files: { item() { return { type, size } } } }
            return c.handlePhotoChange({ currentTarget: input }).then(() => { assert.equal(input.value, '') })
        },
        encode(blob = new Blob(['encoded'], { type: 'image/webp' }), index = pending.length - 1) { pending[index](blob) },
    }
}
async function accepted(h) { await h.choose(); h.encode(); return h.c.photo }
function retained(h, file) { assert.equal(h.c.photo, file); assert.equal(h.c.photoPreview, 'blob:1'); assert.equal(h.c.isCheckingPhoto, false) }

for (const [width, height, expected] of [[3024,4032,[900,1200]], [4032,3024,[1200,900]], [400,300,[400,300]], [1200,1200,[1200,1200]], [1,5000,[1,1200]]]) {
    test(`dimensions ${width}x${height}: preserve proportions without enlargement`, async () => {
        const h = harness({ width, height }); await h.choose(); h.encode()
        assert.deepEqual([h.canvases[0].width,h.canvases[0].height], expected)
        assert.equal(h.canvases[0].type, 'image/webp'); assert.equal(h.canvases[0].quality, .8)
        assert.equal(h.decoded[0].bitmap.closed, true)
        assert.equal(h.c.photo.name, 'profile-photo.webp'); assert.equal(h.c.photo.type, 'image/webp')
        assert.equal(h.urls[0], h.c.photo)
    })
}
for (const type of ['image/jpeg','image/png','image/webp']) {
    test(`accept ${type} at exactly 10 MiB`, async () => { const h=harness(); await h.choose(type,10*1024*1024); h.encode(); assert.ok(h.c.photo) })
}
for (const [label,type,size] of [['oversize','image/png',10*1024*1024+1],['unsupported','image/gif',10]]) {
    test(`${label} replacement preserves accepted file and preview`, async () => { const h=harness(); const old=await accepted(h); await h.choose(type,size); retained(h,old); assert.equal(h.decoded.length,1) })
}
for (const [label,blob] of [['null',null],['PNG fallback',new Blob(['x'],{type:'image/png'})],['oversize result',new Blob([new Uint8Array(2*1024*1024+1)],{type:'image/webp'})]]) {
    test(`${label} encoding preserves accepted file and allows recovery`, async () => { const h=harness(); const old=await accepted(h); await h.choose(); h.encode(blob); retained(h,old); await h.choose(); h.encode(); assert.notEqual(h.c.photo,old); assert.equal(h.c.isCheckingPhoto,false) })
}
test('accept exactly 2 MiB encoded output', async () => { const h=harness(); await h.choose(); h.encode(new Blob([new Uint8Array(2*1024*1024)],{type:'image/webp'})); assert.equal(h.c.photo.size,2*1024*1024) })
for (const option of ['decodeError','noContext','drawError','encodeThrow']) {
    test(`${option} releases resources and exits checking`, async () => { const h=harness({[option]:true}); await h.choose(); assert.equal(h.c.photo,null); assert.equal(h.c.isCheckingPhoto,false); for(const d of h.decoded) assert.equal(d.bitmap.closed,true) })
}
test('newest encoding wins when callbacks finish out of order', async () => { const h=harness(); await h.choose(); await h.choose(); h.encode(undefined,1); const latest=h.c.photo; h.encode(undefined,0); assert.equal(h.c.photo,latest); assert.equal(h.urls.length,1) })
test('rejected newer choice invalidates pending encoder', async () => { const h=harness(); await h.choose(); await h.choose('image/gif'); h.encode(); assert.equal(h.c.photo,null); assert.equal(h.urls.length,0) })
test('Clear cancels pending encoding and same file can be reselected', async () => { const h=harness(); await h.choose(); h.c.handleClearPhotoClick(); h.encode(); assert.equal(h.c.photo,null); assert.equal(h.c.photoPreview,'sample'); assert.equal(h.c.photoInputRef.current.value,''); await accepted(h); assert.ok(h.c.photo) })
test('Clear cancels pending decoding and closes decoded bitmap', async () => { const h=harness({delayDecode:true}); const task=h.choose(); h.c.handleClearPhotoClick(); h.decoded[0].resolve(); await task; assert.equal(h.canvases.length,0); assert.equal(h.decoded[0].bitmap.closed,true); assert.equal(h.c.photo,null) })
test('unmount cleanup invalidates a pending encoding', async () => {
    const h=harness(); await h.choose()
    const cleanup=source.match(/return function cleanup\(\) \{\s*photoCheckRef.current \+= 1\s*\}/)
    assert.ok(cleanup); vm.runInContext('(' + cleanup[0].replace('return ','') + ')()',h.c)
    h.encode(); assert.equal(h.urls.length,0); assert.equal(h.c.photo,null)
})
test('picker cancellation preserves selection', async () => { const h=harness(); const old=await accepted(h); await h.c.handlePhotoChange({currentTarget:{files:{item(){return null}}}}); retained(h,old) })
test('submission sends no requests during compression then uses accepted File', async () => {
    const h=harness(); await h.choose(); await h.c.handleSubmit({preventDefault(){}}); assert.equal(h.calls.length,0)
    h.encode(); await h.c.handleSubmit({preventDefault(){}})
    const data=h.calls.find(x=>x instanceof FormData); assert.ok(data); assert.equal(data.get('photo'),h.c.photo)
})
test('preview effect releases replaced/unmounted object URLs', () => {
    const effect=source.match(/return function cleanup\(\) \{\s*if \(photoPreview !== samplePortrait\) \{\s*URL.revokeObjectURL\(photoPreview\)\s*\}\s*\}/)
    assert.ok(effect); const revoked=[]; const c={photoPreview:'blob:previous',samplePortrait:'sample',URL:{revokeObjectURL(url){revoked.push(url)}}}; vm.createContext(c)
    vm.runInContext('('+effect[0].replace('return ','')+')()',c); c.photoPreview='sample'; vm.runInContext('('+effect[0].replace('return ','')+')()',c); assert.deepEqual(revoked,['blob:previous'])
})
