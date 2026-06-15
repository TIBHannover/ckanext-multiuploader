/**
 * The code is responsilbe for handling a file upload process with drag and drop.
 * 
 * Author: p.oladazimi 
 */

var uploadReqs = [];
var fileList = [];
var dest_url = $('#dest_url').val();
var uploadPercent = 0;
var forbiddenLimit = false;
var already_uploaded_count = 0;
var uploadMaxLimit = parseInt($('#upload_limit').val());
if (uploadMaxLimit === 0) {
    uploadMaxLimit = parseFloat($('#upload_limit').val());
}
// CKAN 2.11 uses <meta name="csrf_token"> (WTF_CSRF_FIELD_NAME default)
var csrf_field_name = $('meta[name=csrf_token]').length ? 'csrf_token' : '_csrf_token';
var csrf_value = $('meta[name=' + csrf_field_name + ']').attr('content') || '';
var progressModal;

$(document).ready(function () {
    // Bootstrap 5: modal must be controlled via the JS API, not jQuery plugin methods
    var modalEl = document.getElementById('progress-modal');
    if (modalEl) {
        progressModal = new bootstrap.Modal(modalEl, {
            backdrop: 'static',
            keyboard: false
        });
    }


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
        emptyFiles();
        for (var i = 0; i < files.length; i++) {
            fileList.push(files[i]);
        }
        var filesBox = $('#fileNames');
        $('#fileNameMessage').hide();
        let elem = "<div class='row file-row'><div class='col-sm-12'><span>First</span><span class='size-alert-span' id='SIZE_ALERT_ID'>Second</span></div></div>";
        for (var i = 0; i < fileList.length; i++) {
            elem = elem.replace('First', "<div class='fileItem' id='ID'>FILE  <i class='fa fa-close'></i></div>");
            elem = elem.replace('Second', "<div class='size-alert'><p>File too big!</p></div>");
            elem = elem.replace('ID', i);
            elem = elem.replace('SIZE_ALERT_ID', 'size-alert-id-' + i);
            elem = elem.replace('FILE', fileList[i].name);
            filesBox.append(elem);
            elem = "<div class='row file-row'><div class='col-sm-12'><span>First</span><span class='size-alert-span' id='SIZE_ALERT_ID'>Second</span></div></div>";

        }
        checkFileSizes();
        $('#LinkBtn').hide();
        $('#RemoveBtn').show();
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
    $(document).on('click', '.file-row', function (e) {
        if ($(e.target).is('i')) {
            let idx = parseInt($(this).find('.fileItem').eq(0).attr('id'));
            fileList.splice(idx, 1);
            $(this).remove();
            if ($('.file-row').length === 0) {
                forbiddenLimit = false;
                $('#file-danger-size').hide();
                $('#UpBtn').click();
            }
            else {
                checkFileSizes();
                if (!forbiddenLimit) {
                    $('#file-danger-size').hide();
                }
                $("#fileUpload")[0].value = '';
                $('#fileUpload').trigger("change");
            }
        }

    });


    /**
     * stop the default CKAN form submitting
     */
    $("#resource-edit").on('submit', function (e) {
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
        if ($('#urlBox:visible').length !== 0 && linkValidity()) {
            // Link upload (not file)
            uploadLink(sBtn);
            return 0;
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
            updateProgressBar(0);
            $('#upload-status-text').text('Preparing upload of ' + fileList.length + ' file' + (fileList.length > 1 ? 's' : '') + '...');
            progressModal.show();
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
    $('#upload-progress-bar').html(percent > 0 ? percent + '%' : '');
}


/**
 * check the files size to be less than upload limit
 */
function checkFileSizes() {
    forbiddenLimit = false;
    for (var i = 0; i < fileList.length; i++) {
        let fileSize = fileList[i].size / 1000000000; // Size in GB
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
    formdata.set('description', $('#field-description').val());
    formdata.set(csrf_field_name, csrf_value);

    var oldProgress = 0;
    reqUpload.upload.addEventListener('loadstart', function () {
        $('#upload-status-text').text('Uploading file ' + (already_uploaded_count + 1) + ' of ' + Max + '...');
    }, false);
    reqUpload.upload.addEventListener('progress', function (e) {
        if (e.lengthComputable) {
            let progress = (Math.ceil(e.loaded / (e.total * 1.1) * 100) / Max);
            uploadPercent += (progress - oldProgress);
            updateProgressBar(uploadPercent);
            oldProgress = progress;
        }
    }, false);
    reqUpload.onreadystatechange = function () {
        if (reqUpload.readyState == XMLHttpRequest.DONE && reqUpload.status === 200) {
            already_uploaded_count += 1;
            $('#upload-status-text').text(already_uploaded_count + ' of ' + Max + ' file' + (Max > 1 ? 's' : '') + ' uploaded');
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
    var formdata = new FormData();
    formdata.set('url', $('#urlText').val());
    formdata.set('isLink', 1);
    formdata.set('pck_id', $('#pck_id').val());
    formdata.set('save', action);
    formdata.set('name', $('#urlName').val());
    formdata.set('id', $('#id').val());
    formdata.set('description', $('#field-description').val());
    formdata.set(csrf_field_name, csrf_value);
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
    $('#upload-error-container').hide();
    $('#upload-progress-modal-close').hide();
    $('#upload-cancel').hide();
    $('.modal-title').hide();
    uploadReqs.forEach(function (req) { req.abort(); });
    uploadReqs = [];
    let filenames = fileList.map(function (f) { return f.name; });
    already_uploaded_count = 0;
    uploadPercent = 0;
    var formdata = new FormData();
    let dest_url = $('#cancel_upload_url').val();
    formdata.set('pck_id', $('#pck_id').val());
    formdata.set('filenames', filenames);
    formdata.set(csrf_field_name, csrf_value);
    var req = new XMLHttpRequest();
    req.onreadystatechange = function () {
        if (req.readyState == XMLHttpRequest.DONE && req.status === 200) {
            progressModal.hide();
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
    formdata.set(csrf_field_name, csrf_value);
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


function fileValidity() {
    return fileList.length !== 0 && !forbiddenLimit;
}

function linkValidity() {
    return $('#urlText').val() !== '';
}

function emptyFiles() {
    forbiddenLimit = false;
    $('.file-row').remove();
}
