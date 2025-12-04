/**
 * Handles drag-and-drop and normal file uploads for CKAN.
 * Author: p.oladazimi (refactored)
 */

let uploadRequests = [];
let fileList = [];
let uploadPercent = 0;
let forbiddenLimit = false;
let alreadyUploadedCount = 0;

const destUrl = $('#dest_url').val();
let uploadMaxLimit = parseInt($('#upload_limit').val());
if (uploadMaxLimit === 0) uploadMaxLimit = parseFloat($('#upload_limit').val());

$(document).ready(function () {

    /** Select files */
    $('#UpBtn').on('click', () => $('#fileUpload').trigger('click'));

    /** Remove all files */
    $('#RemoveBtn').on('click', function () {
        resetFileState();
        $(this).hide();
    });

    /** File chosen */
    $('#fileUpload').on('change', function () {
        console.log("📁 New file selection");
        resetFileEntries();
        let files = this.files;

        for (let f of files) fileList.push(f);
        renderFileList();
        checkFileSizes();

        $('#LinkBtn').hide();
        $('#RemoveBtn').show();
    });

    /** Switch to URL upload */
    $('#LinkBtn').on('click', function () {
        $('.upload-related-parts').hide();
        $('#urlBox').show();
        $('#file-danger').hide();
    });

    /** Remove URL and restore file UI */
    $('#urlRemove').on('click', function () {
        $('#urlBox').hide();
        $('.upload-related-parts').show();
        $('#file-danger').hide();
    });

    /** Remove a file item */
    $(document).on('click', '.file-row i', function () {
        const row = $(this).closest('.file-row');
        const idx = parseInt(row.find('.fileItem').attr('data-id'));
        fileList.splice(idx, 1);
        row.remove();

        if ($('.file-row').length === 0) {
            forbiddenLimit = false;
            $('#file-danger-size').hide();
            $('#UpBtn').click();
        } else {
            $("#fileUpload").val('');
            $('#fileUpload').trigger("change");
        }
    });

    /** Stop CKAN default form submission */
    $('#resource-edit').on('submit', e => e.preventDefault());

    /** Save button */
    $('button[name="Csave"]').on('click', handleSaveAction);

    /** Cancel upload */
    $('#upload-cancel').on('click', cancelUploads);

    /** Close modal */
    $('#upload-progress-modal-close').on('click', () => location.reload());

    setupDragAndDrop();
});

/* ---------------- Core Logic ---------------- */

function handleSaveAction() {
    const action = $(this).val();
    console.log("🟢 Save clicked:", action);

    if (action === "go-dataset") {
        sendPreviousRequest(action);
        return;
    }

    if (isUrlMode() && isValidUrl()) {
        uploadUrl(action);
        return;
    }

    if (!isFileValid()) {
        forbiddenLimit ? $('#file-danger-size').show() : flashError('#file-danger');
        return;
    }

    $('#cancel_waiting').hide();
    $('#upload-error-container').hide();
    $('#file-danger-size').hide();
    $('#upload-cancel').show();
    $('#progress-modal').modal({ backdrop: 'static', keyboard: false, show: true });

    startUpload(action);
}

/* ---------------- Upload Process ---------------- */

function startUpload(action) {
    uploadPercent = 0;
    for (let file of fileList) uploadFile(file, action, fileList.length);
}

function uploadFile(file, action, totalFiles) {
    console.log("🚚 Uploading:", file.name);

    let xhr = new XMLHttpRequest();
    uploadRequests.push(xhr);

    let form = new FormData();
    form.append('files', file);
    form.append('isLink', 0);
    form.append('pck_id', $('#pck_id').val());
    form.append('save', action);
    form.append('id', $('#id').val());
    form.append('description', $('#field-description').val());
    form.append('csrf_token', $('meta[name=_csrf_token]').attr('content'));

    let lastProgress = 0;

    xhr.upload.addEventListener('progress', e => {
        let part = Math.ceil(e.loaded / (e.total * 1.1) * 100) / totalFiles;
        uploadPercent += (part - lastProgress);
        updateProgress(uploadPercent);
        lastProgress = part;
    });

    xhr.onreadystatechange = function () {
        if (xhr.readyState !== XMLHttpRequest.DONE) return;

        if (xhr.status === 200) {
            console.log("✅ Upload:", file.name);
        } else {
            console.log("❌ Upload failed:", file.name, xhr.status);
        }
    };

    xhr.open("POST", destUrl);
    xhr.send(form);
}

/* ---------------- URL Upload ---------------- */

function uploadUrl(action) {
    let form = new FormData();
    form.append('url', $('#urlText').val());
    form.append('isLink', 1);
    form.append('pck_id', $('#pck_id').val());
    form.append('save', action);
    form.append('name', $('#urlName').val());
    form.append('id', $('#id').val());
    form.append('description', $('#field-description').val());

    let xhr = new XMLHttpRequest();
    xhr.onreadystatechange = () => {
        if (xhr.readyState === XMLHttpRequest.DONE && xhr.status === 200) {
            window.location.replace(xhr.responseText);
        }
    };

    xhr.open("POST", destUrl);
    xhr.send(form);
}

/* ---------------- Cancel Upload ---------------- */

function cancelUploads() {
    console.log("⛔ Cancel uploads");

    $('#cancel_waiting').show();
    $('#progress-bar-container').hide();
    $('#upload-cancel').hide();

    for (let req of uploadRequests) req.abort();

    let form = new FormData();
    form.append('pck_id', $('#pck_id').val());
    form.append('filenames', fileList.map(f => f.name));

    let xhr = new XMLHttpRequest();
    xhr.onreadystatechange = () => {
        if (xhr.readyState === XMLHttpRequest.DONE && xhr.status === 200)
            $('#progress-modal').modal('hide');
    };

    xhr.open("POST", $('#cancel_upload_url').val());
    xhr.send(form);
}

/* ---------------- Helpers ---------------- */

function updateProgress(p) {
    p = Math.ceil(p);
    $('#upload-progress-bar').css('width', p + '%').html(p + '%');
}

function checkFileSizes() {
    forbiddenLimit = false;
    $('.size-alert').hide();

    fileList.forEach((file, i) => {
        if (file.size / 1e9 > uploadMaxLimit) {
            forbiddenLimit = true;
            $('#size-alert-id-' + i).show();
        }
    });
}

function isFileValid() {
    return fileList.length > 0 && !forbiddenLimit;
}

function isUrlMode() {
    return $('#urlBox').is(':visible');
}

function isValidUrl() {
    return $('#urlText').val() !== '';
}

function flashError(el) {
    $(el).show();
    setTimeout(() => $(el).hide(), 8000);
}

function resetFileEntries() {
    fileList = [];
    $('.file-row').remove();
}

function resetFileState() {
    resetFileEntries();
    $('#fileUpload').val('');
    $('#fileNameMessage').show();
    $('#LinkBtn').show();
    $('#file-danger').hide();
}

function renderFileList() {
    let box = $('#fileNames');
    $('#fileNameMessage').hide();

    fileList.forEach((file, i) => {
        let row = `
            <div class="row file-row">
                <div class="col-sm-12">
                    <span class="fileItem" data-id="${i}">
                        ${file.name} <i class="fa fa-close"></i>
                    </span>
                    <span class="size-alert-span" id="size-alert-id-${i}">
                        <div class="size-alert"><p>File too big!</p></div>
                    </span>
                </div>
            </div>`;
        box.append(row);
    });
}

function setupDragAndDrop() {
    $('html')
        .on('dragover drop', e => { e.preventDefault(); e.stopPropagation(); });

    $('.module')
        .on('dragover', e => {
            e.originalEvent.dataTransfer.dropEffect = "copy";
            $('#fileNames').addClass('drag_over');
            return false;
        })
        .on('dragleave', () => $('#fileNames').removeClass('drag_over'))
        .on('drop', e => {
            e.preventDefault();
            $('#fileNames').removeClass('drag_over');
            $("#fileUpload")[0].files = e.originalEvent.dataTransfer.files;
            $("#fileUpload").trigger('change');
        });
}

/* deprecated */
function sendPreviousRequest(action) {
    let form = new FormData();
    form.append('save', action);
    form.append('pck_id', $('#pck_id').val());

    let xhr = new XMLHttpRequest();
    xhr.onreadystatechange = () => {
        if (xhr.readyState === XMLHttpRequest.DONE && xhr.status === 200)
            window.location.replace(xhr.responseText);
    };

    xhr.open("POST", destUrl);
    xhr.send(form);
}
