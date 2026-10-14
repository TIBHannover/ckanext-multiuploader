/**
 * The code is responsilbe for handling a file upload process with drag and drop.
 * 
 * Author: p.oladazimi 
 */

var uploadReqs = [];
var fileList = [];
// Enable separate descriptions for every uploaded resource.
var individualDescriptions =
    $('#individual-descriptions-enabled').val() === 'true';
var dest_url = $('#dest_url').val();
var uploadPercent = 0;
var forbiddenLimit = false;
var already_uploaded_count = 0;
var uploadMaxLimit = parseInt($('#upload_limit').val());
if (uploadMaxLimit === 0) {
    uploadMaxLimit = parseFloat($('#upload_limit').val());
}
// CKAN publishes the configured POST field separately from the token itself.
function addCsrfToken(formdata) {
    var field = $('meta[name="csrf_field_name"]').attr('content');
    if (!field) {
        field = $('meta[name="csrf_token"]').length ? 'csrf_token' : '_csrf_token';
    }
    var meta = document.getElementsByName(field)[0];
    if (meta && meta.content) {
        formdata.set(field, meta.content);
    }
}

var progressModal;
function toggleProgressModal(show) {
    var element = document.getElementById('progress-modal');
    if (!element) {
        return;
    }
    if (window.bootstrap && typeof window.bootstrap.Modal === 'function') {
        if (!progressModal) {
            var options = {backdrop: 'static', keyboard: false};
            var Modal = window.bootstrap.Modal;
            progressModal = typeof Modal.getOrCreateInstance === 'function'
                ? Modal.getOrCreateInstance(element, options)
                : new Modal(element, options);
        }
        progressModal[show ? 'show' : 'hide']();
    } else if (typeof $.fn.modal === 'function') {
        $(element).modal(show ? {backdrop: 'static', keyboard: false, show: true} : 'hide');
    } else {
        // Keep progress and cancellation accessible if a theme omits Bootstrap JS.
        $(element).toggle(show).toggleClass('show', show).attr('aria-hidden', !show);
    }
}

/**
 * Display uploaded filenames and individual description fields.
 * Used only when individual descriptions are enabled.
 */
function renderResourceFiles() {

    var filesBox = $('#fileNames');

    // Remove previously displayed file rows.
    filesBox.find('.file-row').remove();

    if (fileList.length === 0) {
        $('#fileNameMessage').show();
        return;
    }

    $('#fileNameMessage').hide();

    // Create one row for every selected file.
    fileList.forEach(function (file, index) {

        var row = $('<div>', {
            'class': 'row file-row',
            'data-index': index
        });

        var column = $('<div>', {
            'class': 'col-sm-12'
        });

        var fileName = $('<div>', {
            'class': 'fileItem'
        }).text(file.name + '  ');

        var removeButton = $('<button>', {
            type: 'button',
            'class': 'btn btn-sm btn-danger remove-resource',
            text: 'Remove'
        });

        fileName.append(removeButton);

        var sizeAlert = $('<div>', {
            'class': 'size-alert',
            id: 'size-alert-id-' + index
        }).text('File too big!').hide();

        var descriptionLabel = $('<label>', {
            text: 'Resource Description *'
        });

        var descriptionInput = $('<textarea>', {
            'class': 'form-control resource-description',
            rows: 3,
            placeholder: 'Enter a description for this resource',
            required: true
        });

        // Restore description when the list is redrawn.
        descriptionInput.val(file._resourceDescription || '');

        // Save each description with its corresponding file.
        descriptionInput.on('input', function () {
            file._resourceDescription = $(this).val();
        });

        column.append(fileName);
        column.append(sizeAlert);
        column.append(descriptionLabel);
        column.append(descriptionInput);

        row.append(column);
        filesBox.append(row);
    });
}

$(document).ready(function () {


    /**
     * click the upload/remove button
     */
    $('#UpBtn').on('click', function () {
        $('#fileUpload').trigger('click');

    });


    /**
     * Click Remove All button to remove already uploaded files.
     */
    $("#RemoveBtn").click(function () {
        $('#LinkBtn').show();
        $('#fileUpload').val('');
        $('#fileNameMessage').show();
        fileList = [];
        emptyFiles();
        $(this).hide();
        $('#file-danger-size').hide();
        $('#file-danger').hide();
    });


    /**
     *  triggers when the user adds a new file(s)
     */
    $(document).on('change', '#fileUpload', function () {

    var files = $("#fileUpload")[0].files;

    // Store selected files.
    for (var i = 0; i < files.length; i++) {
        fileList.push(files[i]);
    }

    // Individual descriptions for TRR375.
    if (individualDescriptions) {

        renderResourceFiles();

    } else {

        // Original uploader behavior for other projects.
        emptyFiles();

        var filesBox = $('#fileNames');

        $('#fileNameMessage').hide();

        for (var i = 0; i < fileList.length; i++) {

            var row = $('<div>', {
                'class': 'row file-row'
            });

            var column = $('<div>', {
                'class': 'col-sm-12'
            });

            var fileItem = $('<div>', {
                'class': 'fileItem',
                id: i
            }).text(fileList[i].name + '  ');

            fileItem.append(
                $('<i>', {'class': 'fa fa-close'})
            );

            var sizeAlert = $('<span>', {
                'class': 'size-alert-span',
                id: 'size-alert-id-' + i
            }).text('File too big!').hide();

            column.append(fileItem);
            column.append(sizeAlert);
            row.append(column);

            filesBox.append(row);
        }
    }

    checkFileSizes();

    $('#LinkBtn').hide();
    $('#RemoveBtn').show();

    // Allow adding more files through the same file input.
    if (individualDescriptions) {
        $('#fileUpload').val('');
    }
});



    /**
     *  No file upload, add a link instead of a data file
     */
    $('#LinkBtn').click(function () {
        $('#RemoveBtn').hide();
        $('.upload-related-parts').hide();
        $('#urlBox').show();
        $('#file-danger').hide();
    });


    /**
     * remove the added url
     */
    $('#urlRemove').click(function () {
        $('.upload-related-parts').show();
        $('#urlBox').hide();
        $('#file-danger').hide();
    });


    /**
     * delete an already added file 
     */
    // Remove an individual file in individual-description mode.
$(document).on('click', '.remove-resource', function (e) {

    e.preventDefault();

    var index = parseInt(
        $(this).closest('.file-row').attr('data-index'),
        10
    );

    fileList.splice(index, 1);

    renderResourceFiles();

    checkFileSizes();

    if (fileList.length === 0) {
        $('#RemoveBtn').hide();
        $('#LinkBtn').show();
    }
});


// Preserve existing removal behavior for other projects.
$(document).on('click', '.file-row', function (e) {

    if (individualDescriptions) {
        return;
    }

    if ($(e.target).is('i')) {

        var index = parseInt(
            $(this).find('.fileItem').first().attr('id'),
            10
        );

        fileList.splice(index, 1);

        // Redraw the remaining files without clearing fileList.
        $('#fileNames .file-row').remove();

        fileList.forEach(function (file, i) {

            var row = $('<div>', {
                'class': 'row file-row'
            });

            var column = $('<div>', {
                'class': 'col-sm-12'
            });

            var item = $('<div>', {
                'class': 'fileItem',
                id: i
            }).text(file.name + '  ');

            item.append($('<i>', {'class': 'fa fa-close'}));

            var alertBox = $('<span>', {
                'class': 'size-alert-span',
                id: 'size-alert-id-' + i
            }).text('File too big!').hide();

            column.append(item);
            column.append(alertBox);
            row.append(column);

            $('#fileNames').append(row);
        });

        checkFileSizes();

        if (fileList.length === 0) {
            $('#fileNameMessage').show();
            $('#RemoveBtn').hide();
            $('#LinkBtn').show();
        }
    }
});


    /**
     * stop the default CKAN form submitting 
     */
    $("#resource-edit").bind('submit', function (e) {
        e.preventDefault();
        return false;
    });


    /**
     * clicks on the Add button
     */
    $('button[name="Csave"]').click(function () {
        var sBtn = $(this).val();
        if ($(this).val() === "go-dataset") {
            // previous step (dataset metadat page)
            previous("go-dataset");
            return 0;
        }
        if ($('#urlBox:visible').length !== 0 && LinkValidity()) {
            // Link upload (not file)
            uploadLink(sBtn);
            return 0;
        }
        // Validate every resource description before uploading.
        if (individualDescriptions) {

            var missingDescription = fileList.some(function (file) {
                return !file._resourceDescription ||
                       !file._resourceDescription.trim();
            });

            if (missingDescription) {

                alert(
                    'Please enter a description for every resource before uploading.'
                );

                return;
            }
        }
        if (fileValidity()) {
            $('#cancel_waiting').hide();
            $('.modal-title').show();
            $('#upload-cancel').show();
            $('#progress-bar-container').show();
            $('#upload-error-container').hide();
            $('#file-danger-size').hide();
            uploadPercent = 0;
            already_uploaded_count = 0;
            uploadReqs = [];
            updateProgressBar(0);
            $('#upload-progress-modal-close').hide();
            $('#upload-status-text').text(ckan.i18n._('Uploading ...'));
            toggleProgressModal(true);
            for (var i = 0; i < fileList.length; i++) {
                // upload a file
                uploadFiles(fileList[i], sBtn, fileList.length);
            }
        }
        else {
            if (forbiddenLimit) {
                // passed the size limit
                $('#file-danger-size').show();
            }
            else {
                // no file is selected            
                $('#file-danger').show();
                setTimeout(function () {
                    $('#file-danger').hide();
                }, 10000);
            }
        }
    });


    /**
     * Close the progress modal pop up
     */
    $('#upload-progress-modal-close').click(function () {
        location.reload();
        return false;
    });


    /**
     * Cancel an ongoing upload
     */
    $('#upload-cancel').click(function () {
        cancelAlreadyUploaded();
    });


});


/**
 * update the progress bar with upload percentage
 * @param {*} percent 
 */
function updateProgressBar(percent) {
    percent = Math.ceil(percent);
    $('#upload-progress-bar').css('width', percent + '%');
    $('#upload-progress-bar').attr('aria-valuenow', percent);
    $('#upload-progress-bar').text(percent + '%');
}


/**
 * check the files size to be less than upload limit
 */
function checkFileSizes() {
    forbiddenLimit = false;
    for (var i = 0; i < fileList.length; i++) {
        var fileSize = fileList[i].size / 1000000000; // Size in GB
        if (fileSize > uploadMaxLimit) {
            forbiddenLimit = true;
            $('#size-alert-id-' + i).show();
        }
    }
}

/**
 * Upload a file to server
 * 
 */
function uploadFiles(file, action, Max) {
    var formdata = new FormData();
    let reqUpload = new XMLHttpRequest();
    uploadReqs.push(reqUpload);
    formdata.set('files', file);
    formdata.set('isLink', 0);
    formdata.set('pck_id', $('#pck_id').val());
    formdata.set('save', action);
    formdata.set('id', $('#id').val());
    // Send individual description or the existing shared description.
    if (individualDescriptions) {

        formdata.set(
            'description',
            file._resourceDescription || ''
        );

    } else {

        formdata.set(
            'description',
            $('#field-description').val() || ''
        );

    }
    addCsrfToken(formdata);

    var oldProgress = 0;
    reqUpload.upload.addEventListener('progress', function (e) {
        if (!e.lengthComputable) {
            return;
        }
        let progress = (Math.ceil(e.loaded / (e.total * 1.1) * 100) / Max);
        uploadPercent += (progress - oldProgress)
        updateProgressBar(uploadPercent);
        oldProgress = progress
    }, false);
    reqUpload.onreadystatechange = function () {
        if (reqUpload.readyState == XMLHttpRequest.DONE && reqUpload.status === 200) {
            already_uploaded_count += 1;
            $('#upload-status-text').text(ckan.i18n._('Uploaded %(count)s of %(total)s files', {count: already_uploaded_count, total: Max}));
            if (already_uploaded_count === Max) {
                updateProgressBar(100);
                window.location.replace(this.responseText);
            }

        }
        else if (reqUpload.readyState == XMLHttpRequest.DONE && reqUpload.status !== 200) {
            $('#progress-bar-container').hide();
            $('#upload-error-container').show();
            $('#upload-progress-modal-close').show();
        }
    }
    reqUpload.open("POST", dest_url)
    reqUpload.send(formdata)
    return 0;
}

/**
 * 
 * Upload a link instead of a file
 */
function uploadLink(action) {
    // A URL resource also requires its own description.
    if (individualDescriptions &&
        !$('#field-link-description').val().trim()) {
    
        alert('Please enter a resource description.');
        return;
    }
    var formdata = new FormData();
    formdata.set('url', $('#urlText').val());
    formdata.set('isLink', 1);
    formdata.set('pck_id', $('#pck_id').val());
    formdata.set('save', action);
    formdata.set('name', $('#urlName').val());
    formdata.set('id', $('#id').val());
    if (individualDescriptions) {

    formdata.set(
        'description',
        $('#field-link-description').val()
    );

    } else {

    formdata.set(
        'description',
        $('#field-description').val() || ''
    );

    }
    addCsrfToken(formdata);
    var req = new XMLHttpRequest();
    req.onreadystatechange = function () {
        if (req.readyState == XMLHttpRequest.DONE && req.status === 200) {
            window.location.replace(this.responseText);
        }
    }
    req.open("POST", dest_url)
    req.send(formdata)
    return 0;
}

/**
 * Cancel uploaded files
 */
function cancelAlreadyUploaded() {
    $('#cancel_waiting').show();
    $('#progress-bar-container').hide();
    $('.modal-title').hide();
    for (let i = 0; i < uploadReqs.length; i++) {
        uploadReqs[i].abort();
        $('#upload-error-container').hide();
        $('#upload-progress-modal-close').hide();
        $('#upload-cancel').hide();
    }
    uploadReqs = [];
    let filenames = [];
    for (let i = 0; i < fileList.length; i++) {
        filenames.push(fileList[i].name);
    }
    already_uploaded_count = 0;
    uploadPercent = 0;
    var formdata = new FormData();
    let dest_url = $('#cancel_upload_url').val();
    formdata.set('pck_id', $('#pck_id').val());
    filenames.forEach(function (name) { formdata.append('filenames[]', name); });
    addCsrfToken(formdata);
    var req = new XMLHttpRequest();
    req.onreadystatechange = function () {
        if (req.readyState == XMLHttpRequest.DONE && req.status === 200) {
            toggleProgressModal(false);
        }
    }
    req.open("POST", dest_url)
    req.send(formdata)
    return 1;
}



/**
 * 
 * when click the previous button (deprecated)
 */
function previous(action) {
    var formdata = new FormData();
    formdata.set('save', action);
    formdata.set('pck_id', $('#pck_id').val());
    addCsrfToken(formdata);
    var req = new XMLHttpRequest();
    req.onreadystatechange = function () {
        if (req.readyState == XMLHttpRequest.DONE && req.status === 200) {
            window.location.replace(this.responseText);
        }
    }
    req.open("POST", dest_url)
    req.send(formdata)
    return 0;
}


/**
 * file validity check
 * @returns 
 */
function fileValidity() {
    if (fileList.length !== 0 && !forbiddenLimit) {
        return true;
    }
    return false
}

/**
 * Link added by the user or not
 * @returns 
 */
function LinkValidity() {
    if ($('#urlText').val() !== '') {
        return true;
    }
    return false
}

/**
 * empty the File box list
 */
function emptyFiles() {
    forbiddenLimit = false;
    let items = $('.file-row');
    for (var i = 0; i < items.length; i++) {
        items[i].remove();
    }
}
