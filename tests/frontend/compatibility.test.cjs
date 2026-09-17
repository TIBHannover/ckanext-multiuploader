const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const {test} = require('node:test');

const source = fs.readFileSync('ckanext/multiuploader/public/statics/multi_uploader.js', 'utf8');

function environment({field, tokenName = '_csrf_token', token = 'test-token', modal = true, api = 'bootstrap'} = {}) {
    const elements = new Map();
    const requests = [];
    const modalCalls = [];
    const modalElement = {};
    function $(selector) {
        if (!elements.has(selector)) {
            elements.set(selector, {
                length: selector === 'meta[name="csrf_token"]' ? Number(tokenName === 'csrf_token') : 1,
                attrs: {}, value: '',
                ready(fn) { this.readyCallback = fn; },
                attr(name, value) {
                    if (value === undefined) {
                        if (selector === 'meta[name="csrf_field_name"]') return field;
                        return this.attrs[name];
                    }
                    this.attrs[name] = value;
                    return this;
                },
                val() { return this.value; },
                on() { return this; },
                bind() { return this; },
                click(fn) { this.clickCallback = fn; return this; },
                css(name, value) { this[name] = value; return this; },
                text(value) { this.content = value; return this; },
                show() { this.visible = true; return this; },
                hide() { this.visible = false; return this; },
                toggle(value) { this.visible = value; return this; },
                toggleClass() { return this; },
                modal(value) { modalCalls.push(value); return this; }
            });
        }
        return elements.get(selector);
    }
    $.fn = api === 'jquery' ? {modal() {}} : {};
    class Request {
        static DONE = 4;
        constructor() {
            this.events = {};
            this.upload = {addEventListener: (event, fn) => { this.events[event] = fn; }};
            requests.push(this);
        }
        open(method, url) { this.method = method; this.url = url; }
        send(data) { this.data = data; }
        abort() { this.aborted = true; }
    }
    function Modal() {}
    Modal.getOrCreateInstance = () => ({show() { modalCalls.push('show'); }, hide() { modalCalls.push('hide'); }});
    const context = {
        $, FormData, XMLHttpRequest: Request, ckan: {i18n: {_: text => text}},
        document: {
            getElementsByName: name => name === tokenName && token ? [{content: token}] : [],
            getElementById: () => modal ? modalElement : null
        },
        window: {bootstrap: api === 'bootstrap' ? {Modal} : undefined},
    };
    vm.createContext(context);
    vm.runInContext(source, context);
    return {context, $, requests, modalCalls, modalElement};
}

for (const name of ['_csrf_token', 'csrf_token', 'custom_csrf']) {
    test(`all POST paths send configured CSRF field ${name}`, () => {
        const {context: c, requests} = environment({field: name, tokenName: name});
        c.uploadFiles(new Blob(['data']), 'go-metadata', 1);
        c.uploadLink('go-metadata');
        c.cancelAlreadyUploaded();
        c.previous('go-dataset');
        assert.equal(requests.length, 4);
        for (const req of requests) assert.equal(req.data.get(name), 'test-token');
    });
}
for (const name of ['_csrf_token', 'csrf_token']) {
    test(`legacy metadata fallback ${name}`, () => {
        const {context: c} = environment({tokenName: name});
        const data = new FormData();
        c.addCsrfToken(data);
        assert.equal(data.get(name), 'test-token');
    });
}
test('missing token does not submit an undefined value', () => {
    const {context: c} = environment({token: ''});
    const data = new FormData();
    c.addCsrfToken(data);
    assert.deepEqual([...data], []);
});
for (const api of ['bootstrap', 'jquery', 'none']) {
    test(`modal show and hide with ${api}`, () => {
        const {context: c, modalCalls, $, modalElement} = environment({api});
        c.toggleProgressModal(true);
        c.toggleProgressModal(false);
        if (api === 'bootstrap') assert.deepEqual(modalCalls, ['show', 'hide']);
        if (api === 'jquery') {
            assert.equal(modalCalls[0].backdrop, 'static');
            assert.equal(modalCalls[1], 'hide');
        }
        if (api === 'none') assert.equal($(modalElement).visible, false);
    });
}
test('missing modal is safe', () => {
    const {context: c, modalCalls} = environment({modal: false});
    c.toggleProgressModal(true);
    c.toggleProgressModal(false);
    assert.deepEqual(modalCalls, []);
});
test('progress ignores unknown totals and updates accessibility state', () => {
    const {context: c, $, requests} = environment();
    c.uploadFiles(new Blob(['data']), 'go-metadata', 1);
    requests[0].events.progress({lengthComputable: false, loaded: 1, total: 0});
    assert.equal(c.uploadPercent, 0);
    requests[0].events.progress({lengthComputable: true, loaded: 5, total: 10});
    assert.equal($('#upload-progress-bar').attrs['aria-valuenow'], 46);
    c.updateProgressBar(0);
    assert.equal($('#upload-progress-bar').attrs['aria-valuenow'], 0);
    assert.equal($('#upload-progress-bar').width, '0%');
});

test('cancellation preserves filenames containing commas', () => {
    const {context: c, requests} = environment();
    c.fileList = [{name: 'first,part.csv'}, {name: 'second.csv'}];
    c.cancelAlreadyUploaded();
    assert.deepEqual(requests[0].data.getAll('filenames[]'), ['first,part.csv', 'second.csv']);
});

test('starting another upload resets progress and request tracking', () => {
    const {context: c, $, requests} = environment();
    $(c.document).readyCallback();
    c.fileList = [new Blob(['data'])];
    c.uploadPercent = 90;
    c.already_uploaded_count = 4;
    c.uploadReqs = [{}];
    $('button[name="Csave"]').clickCallback.call('button[name="Csave"]');
    assert.equal(c.uploadPercent, 0);
    assert.equal(c.already_uploaded_count, 0);
    assert.equal(c.uploadReqs.length, 1);
    assert.equal(c.uploadReqs[0], requests[0]);
    assert.equal($('#upload-progress-bar').attrs['aria-valuenow'], 0);
    assert.equal($('#upload-progress-modal-close').visible, false);
});
