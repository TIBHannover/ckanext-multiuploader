/**
 * CKAN multiuploader: original file/link upload workflow, with optional
 * per-resource descriptions in a separate expandable metadata section.
 * Setting: ckanext.multiuploader.individual_descriptions = true
 * Requires the hidden #individual-descriptions-enabled input in the template.
 */

var uploadReqs = [];
var fileList = [];
var dest_url = $('#dest_url').val();
var uploadPercent = 0;
var forbiddenLimit = false;
var already_uploaded_count = 0;
var uploadMaxLimit = parseFloat($('#upload_limit').val());
var individualDescriptions = $('#individual-descriptions-enabled').val() === 'true';
var progressModal;
var uploadInProgress = false;

function addCsrfToken(formdata) {
    var field = $('meta[name="csrf_field_name"]').attr('content');
    if (!field) {
        field = $('meta[name="csrf_token"]').length ? 'csrf_token' : '_csrf_token';
    }
    var meta = document.getElementsByName(field)[0];
    if (meta && meta.content) formdata.set(field, meta.content);
}

function toggleProgressModal(show) {
    var element = document.getElementById('progress-modal');
    if (!element) return;
    if (window.bootstrap && typeof window.bootstrap.Modal === 'function') {
        if (!progressModal) {
            var Modal = window.bootstrap.Modal;
            var options = {backdrop: 'static', keyboard: false};
            progressModal = typeof Modal.getOrCreateInstance === 'function'
                ? Modal.getOrCreateInstance(element, options)
                : new Modal(element, options);
        }
        progressModal[show ? 'show' : 'hide']();
    } else if (typeof $.fn.modal === 'function') {
        $(element).modal(show ? {backdrop: 'static', keyboard: false, show: true} : 'hide');
    } else {
        $(element).toggle(show).toggleClass('show', show).attr('aria-hidden', !show);
    }
}

function updateProgressBar(percent) {
    percent = Math.max(0, Math.min(100, Math.ceil(percent)));
    $('#upload-progress-bar').css('width', percent + '%')
        .attr('aria-valuenow', percent).text(percent + '%');
}

function checkFileSizes() {
    forbiddenLimit = false;
    fileList.forEach(function (file, index) {
        var tooBig = isFinite(uploadMaxLimit) &&
            (file.size / 1000000000 > uploadMaxLimit);
        if (tooBig) forbiddenLimit = true;
        $('#size-alert-id-' + index).toggle(tooBig);
    });
}

/** File list stays compact: filenames only, with Remove buttons. */
function renderFileList() {
    var box = $('#fileNames');
    box.find('.file-row').remove();
    $('#fileNameMessage').toggle(fileList.length === 0);

    fileList.forEach(function (file, index) {
        var row = $('<div class="file-row"></div>').attr('data-index', index)
            .css({padding: '7px 9px', borderBottom: '1px solid #eee', display: 'flex',
                  alignItems: 'center', gap: '10px', flexWrap: 'wrap'});
        var title = $('<span class="fileItem"></span>').text(file.name);
        var remove = $('<button type="button" class="btn btn-sm btn-danger remove-resource">Remove</button>');
        var sizeAlert = $('<span class="size-alert-span"></span>')
            .attr('id', 'size-alert-id-' + index).text('File too big!')
            .css({color: '#b42318', display: 'none'});
        row.append(title, remove, sizeAlert);
        box.append(row);
    });

    $('#RemoveBtn').toggle(fileList.length > 0);
    $('#LinkBtn').toggle(fileList.length === 0);
    checkFileSizes();
}

/** Build metadata editor AFTER the original drag-and-drop file box. */
function ensureMetadataPanel() {
    if (!individualDescriptions || $('#resource-metadata-panel').length) return;
    var panel = $('<section id="resource-metadata-panel"></section>')
        .css({marginTop: '18px', marginBottom: '24px'});
    var header = $('<div></div>').css({display: 'flex', alignItems: 'center',
        justifyContent: 'space-between', gap: '8px', flexWrap: 'wrap', marginBottom: '8px'});
    header.append($('<strong></strong>').text('Resource descriptions'));
    header.append($('<span id="resource-metadata-count"></span>')
        .css({color: '#666', fontSize: '13px'}));
    panel.append(header);
    panel.append($('<p></p>')
        .text('Select a filename below to add its description. Each resource needs a description before uploading.')
        .css({color: '#666', fontSize: '13px', marginBottom: '12px'}));
    panel.append($('<div id="resource-metadata-items"></div>'));
    // #fileNameBox contains the existing file drop area and must remain untouched.
    var anchor = $('#fileNameBox');
    if (!anchor.length) anchor = $('#fileNames');
    anchor.after(panel);
}

var expandedFileIndex = 0;
function renderResourceDescriptions() {
    if (!individualDescriptions) return;
    ensureMetadataPanel();
    var panel = $('#resource-metadata-panel');
    panel.toggle(fileList.length > 0 && !$('#urlBox').is(':visible'));
    if (!fileList.length) return;

    var completed = fileList.filter(function (f) {
        return !!(f._resourceDescription || '').trim();
    }).length;
    $('#resource-metadata-count').text(completed + ' of ' + fileList.length + ' completed');
    var list = $('#resource-metadata-items').empty();

    fileList.forEach(function (file, index) {
        var hasDescription = !!(file._resourceDescription || '').trim();
        var card = $('<div class="resource-metadata-card"></div>')
            .css({border: '1px solid #ddd', borderRadius: '5px', marginBottom: '8px',
                  overflow: 'hidden', backgroundColor: '#fff'});
        var trigger = $('<button type="button" class="resource-metadata-toggle"></button>')
            .attr({'aria-expanded': String(expandedFileIndex === index), 'data-index': index})
            .css({display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  width: '100%', padding: '12px 14px', backgroundColor: '#f8f9fa',
                  border: 0, textAlign: 'left', cursor: 'pointer', gap: '12px'});
        var fileTitle = $('<span></span>').text(file.name)
            .css({fontWeight: '600', overflowWrap: 'anywhere'});
        var status = $('<span class="resource-metadata-status"></span>')
            .text(hasDescription ? '✓ Complete' : 'Description required')
            .css({fontSize: '12px', whiteSpace: 'nowrap',
                  color: hasDescription ? '#26733c' : '#a34d00'});
        var arrow = $('<span aria-hidden="true"></span>')
            .text(expandedFileIndex === index ? '▴' : '▾');
        trigger.append(fileTitle, status, arrow);

        var content = $('<div class="resource-metadata-content"></div>')
            .css({padding: '12px 14px', display: expandedFileIndex === index ? 'block' : 'none'});
        var inputId = 'resource-description-' + index;
        var label = $('<label></label>').attr('for', inputId)
            .text('Resource Description *').css({fontWeight: '600', display: 'block'});
        var textarea = $('<textarea class="form-control resource-description" rows="3" required></textarea>')
            .attr({'id': inputId, 'data-index': index,
                   'placeholder': 'What does this file contain?'})
            .val(file._resourceDescription || '');
        content.append(label, textarea);
        card.append(trigger, content);
        list.append(card);
    });
}

function showMissingDescription() {
    for (var i = 0; i < fileList.length; i++) {
        if (!(fileList[i]._resourceDescription || '').trim()) {
            expandedFileIndex = i;
            renderResourceDescriptions();
            $('#resource-description-' + i).trigger('focus');
            return true;
        }
    }
    return false;
}

function resetFiles() {
    fileList = [];
    $('#fileUpload').val('');
    renderFileList();
    if (individualDescriptions) renderResourceDescriptions();
    $('#file-danger, #file-danger-size').hide();
}

function beginUpload() {
    uploadInProgress = true;
    $('#cancel_waiting').hide();
    $('.modal-title').show();
    $('#upload-cancel, #progress-bar-container').show();
    $('#upload-error-container, #file-danger-size, #upload-progress-modal-close').hide();
    uploadPercent = 0;
    already_uploaded_count = 0;
    uploadReqs = [];
    updateProgressBar(0);
    $('#upload-status-text').text(ckan.i18n._('Uploading ...'));
    toggleProgressModal(true);
}

function uploadFiles(file, action, maxCount) {
    var formdata = new FormData();
    var xhr = new XMLHttpRequest();
    uploadReqs.push(xhr);
    formdata.set('files', file);
    formdata.set('isLink', 0);
    formdata.set('pck_id', $('#pck_id').val());
    formdata.set('save', action);
    formdata.set('id', $('#id').val());
    formdata.set('description', individualDescriptions
        ? (file._resourceDescription || '').trim()
        : ($('#field-description').val() || ''));
    addCsrfToken(formdata);

    var previousProgress = 0;
    xhr.upload.addEventListener('progress', function (event) {
        if (!event.lengthComputable || !event.total) return;
        var next = (event.loaded / event.total) * 100 / maxCount;
        uploadPercent += next - previousProgress;
        previousProgress = next;
        updateProgressBar(uploadPercent);
    });
    xhr.onreadystatechange = function () {
        if (xhr.readyState !== XMLHttpRequest.DONE) return;
        if (xhr.status === 200) {
            already_uploaded_count += 1;
            $('#upload-status-text').text(ckan.i18n._(
                'Uploaded %(count)s of %(total)s files',
                {count: already_uploaded_count, total: maxCount}
            ));
            if (already_uploaded_count === maxCount && uploadInProgress) {
                uploadInProgress = false;
                updateProgressBar(100);
                window.location.replace(xhr.responseText);
            }
        } else if (uploadInProgress && xhr.status !== 0) {
            $('#progress-bar-container').hide();
            $('#upload-error-container, #upload-progress-modal-close').show();
            $('#upload-status-text').text('One or more uploads failed.');
            uploadInProgress = false;
            // Cancel requests still in flight; previously saved resources remain in CKAN.
            uploadReqs.forEach(function (request) {
                if (request.readyState !== XMLHttpRequest.DONE) request.abort();
            });
        }
    };
    xhr.open('POST', dest_url);
    xhr.send(formdata);
}

function uploadLink(action) {
    var description = individualDescriptions
        ? ($('#field-link-description').val() || '').trim()
        : ($('#field-description').val() || '');
    if (individualDescriptions && !description) {
        alert('Please enter a description for this linked resource.');
        $('#field-link-description').trigger('focus');
        return;
    }
    var formdata = new FormData();
    formdata.set('url', $('#urlText').val());
    formdata.set('isLink', 1);
    formdata.set('pck_id', $('#pck_id').val());
    formdata.set('save', action);
    formdata.set('name', $('#urlName').val());
    formdata.set('id', $('#id').val());
    formdata.set('description', description);
    addCsrfToken(formdata);
    var xhr = new XMLHttpRequest();
    xhr.onreadystatechange = function () {
        if (xhr.readyState !== XMLHttpRequest.DONE) return;
        if (xhr.status === 200) window.location.replace(xhr.responseText);
        else alert('The resource link could not be saved. Please try again.');
    };
    xhr.open('POST', dest_url);
    xhr.send(formdata);
}

function previous(action) {
    var formdata = new FormData();
    formdata.set('save', action);
    formdata.set('pck_id', $('#pck_id').val());
    addCsrfToken(formdata);
    var xhr = new XMLHttpRequest();
    xhr.onreadystatechange = function () {
        if (xhr.readyState === XMLHttpRequest.DONE && xhr.status === 200)
            window.location.replace(xhr.responseText);
    };
    xhr.open('POST', dest_url);
    xhr.send(formdata);
}

function cancelAlreadyUploaded() {
    $('#cancel_waiting').show();
    $('#progress-bar-container, .modal-title').hide();
    uploadReqs.forEach(function (xhr) { xhr.abort(); });
    uploadInProgress = false;
    uploadReqs = [];
    var filenames = fileList.map(function (file) { return file.name; });
    already_uploaded_count = 0;
    uploadPercent = 0;
    var formdata = new FormData();
    formdata.set('pck_id', $('#pck_id').val());
    filenames.forEach(function (name) { formdata.append('filenames[]', name); });
    addCsrfToken(formdata);
    var xhr = new XMLHttpRequest();
    xhr.onreadystatechange = function () {
        if (xhr.readyState === XMLHttpRequest.DONE && xhr.status === 200) {
            toggleProgressModal(false);
        }
    };
    xhr.open('POST', $('#cancel_upload_url').val());
    xhr.send(formdata);
}

function fileValidity() { return fileList.length > 0 && !forbiddenLimit; }
function LinkValidity() { return !!$('#urlText').val().trim(); }
function emptyFiles() { $('#fileNames .file-row').remove(); }

$(document).ready(function () {
    // Hide both upload errors at first load.
    $('#file-danger, #file-danger-size').hide();
    if (individualDescriptions) ensureMetadataPanel();

    $('#UpBtn').on('click', function () { $('#fileUpload').trigger('click'); });
    $('#RemoveBtn').on('click', function () { resetFiles(); });

    $(document).on('change', '#fileUpload', function () {
        var firstNewIndex = fileList.length;
        Array.prototype.forEach.call(this.files || [], function (file) {
            fileList.push(file);
        });
        // Clearing the native input permits multiple file-selection sessions.
        $(this).val('');
        renderFileList();
        if (individualDescriptions) {
            expandedFileIndex = firstNewIndex;
            renderResourceDescriptions();
        }
    });

    $(document).on('click', '.remove-resource', function (event) {
        event.preventDefault();
        if (uploadInProgress) return;
        var index = Number($(this).closest('.file-row').attr('data-index'));
        if (!Number.isInteger(index) || index < 0 || index >= fileList.length) return;
        fileList.splice(index, 1);
        if (expandedFileIndex >= fileList.length) expandedFileIndex = Math.max(0, fileList.length - 1);
        renderFileList();
        if (individualDescriptions) renderResourceDescriptions();
    });

    $(document).on('click', '.resource-metadata-toggle', function () {
        var clickedIndex = Number($(this).attr('data-index'));
        expandedFileIndex = ($(this).attr('aria-expanded') === 'true')
            ? -1 : clickedIndex;
        renderResourceDescriptions();
    });

    $(document).on('input', '.resource-description', function () {
        var index = Number($(this).attr('data-index'));
        if (!fileList[index]) return;
        fileList[index]._resourceDescription = $(this).val();
        var completed = fileList.filter(function (f) {
            return !!(f._resourceDescription || '').trim();
        }).length;
        $('#resource-metadata-count').text(completed + ' of ' + fileList.length + ' completed');
        $(this).closest('.resource-metadata-card').find('.resource-metadata-status')
            .text($(this).val().trim() ? '✓ Complete' : 'Description required')
            .css('color', $(this).val().trim() ? '#26733c' : '#a34d00');
    });

    $('#LinkBtn').on('click', function () {
        $('#RemoveBtn').hide();
        $('.upload-related-parts').hide();
        $('#urlBox').show();
        $('#resource-metadata-panel').hide();
        $('#file-danger').hide();
    });
    $('#urlRemove').on('click', function () {
        $('.upload-related-parts').show();
        $('#urlBox').hide();
        $('#file-danger').hide();
        if (individualDescriptions) renderResourceDescriptions();
    });

    $('#resource-edit').on('submit', function (event) {
        event.preventDefault();
        return false;
    });

    $('button[name="Csave"]').on('click', function () {
        if (uploadInProgress) return;
        var action = $(this).val();
        if (action === 'go-dataset') { previous(action); return; }
        if ($('#urlBox:visible').length) {
            if (LinkValidity()) uploadLink(action);
            else $('#file-danger').show();
            return;
        }
        if (!fileValidity()) {
            if (forbiddenLimit) $('#file-danger-size').show();
            else $('#file-danger').show();
            return;
        }
        if (individualDescriptions && showMissingDescription()) {
            alert('Please enter a description for every resource before uploading.');
            return;
        }
        beginUpload();
        fileList.forEach(function (file) {
            uploadFiles(file, action, fileList.length);
        });
    });

    $('#upload-progress-modal-close').on('click', function () {
        location.reload();
        return false;
    });
    $('#upload-cancel').on('click', cancelAlreadyUploaded);
});