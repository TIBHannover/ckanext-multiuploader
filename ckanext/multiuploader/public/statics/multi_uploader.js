/**
 * The code is responsible for handling a file upload process with drag and drop.
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

$(document).ready(function () {
    // Click the upload button
    $('#UpBtn').on('click', function () {
        $('#fileUpload').trigger('click');
    });

    // Click Remove All button to remove uploaded files.
    $("#RemoveBtn").click(function () {
        $('#fileUpload').val('');
        $('#fileNameMessage').show();
        fileList = [];
        emptyFiles();
        $(this).addClass("d-none");
        $('#file-danger-size').hide();
        $('#file-danger').hide();
    });

    // Triggers when the user adds new file(s)
    $("#fileUpload").change(function () {
        var files = $("#fileUpload")[0].files; // Get the file list
        emptyFiles(); // Clear any previous entries
        fileList = []; // Reset fileList

        for (var i = 0; i < files.length; i++) {
            fileList.push(files[i]);
        }

        var filesBox = $('#fileNames');
        $('#fileNameMessage').hide();
        for (var i = 0; i < fileList.length; i++) {
            const file = fileList[i];
            const sizeInMB = (file.size / 1e6).toFixed(2); // Size in GB, formatted to 2 decimal points
            // Create alert element for each file
            const elem = `
                <div class="alert alert-dark alert-dismissible fade show" role="alert">
                    <span class="fileItem" id="${i}">${file.name} (${sizeInMB} MB)</span>
                    <span class="size-alert-span" id="size-alert-id-${i}">
                        <div class="size-alert"><p>File too big!</p></div>
                    </span>
                    <button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Close"></button>
                </div>`;
            filesBox.append(elem); // Append the alert to the file names box
        }
        checkFileSizes(); // Check file sizes
        $('#RemoveBtn').removeClass("d-none"); // Show the remove button
    });

    // Prevent the default CKAN form submission 
    $("#resource-edit").on('submit', function (e) {
        e.preventDefault();
        var sBtn = $(this).val();
        if ($(this).val() === "go-dataset") {
            // previous step (dataset metadat page)
            previous("go-dataset");
            return 0;
        }
        // Prepare an array for valid files
        let validFiles = [];
        let anyFileTooBig = false;

        $('#fileNames .alert').each(function () {
            let fileId = $(this).find('.fileItem').attr('id'); // Get the id from the alert
            if ($('#size-alert-id-' + fileId).is(':visible')) {
                anyFileTooBig = true; // Set the flag if any file is too big
            } else {
                validFiles.push(fileList[fileId]); // Collect valid files
            }
        });

        if (validFiles.length > 0 && !anyFileTooBig) {
            $('#cancel_waiting').hide();
            $('.modal-title').show();
            $('#upload-cancel').show();
            $('#progress-bar-container').show();
            $('#upload-error-container').hide();
            $('#file-danger-size').hide();
            $('#progress-modal').modal({
                backdrop: 'static',
                keyboard: false,
            });
            $('#progress-modal').modal('show'); // Show the modal
            for (var i = 0; i < validFiles.length; i++) {
                // Upload only valid files
                uploadFiles(validFiles[i], sBtn, validFiles.length);
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

    // Close the progress modal pop up
    $('#upload-progress-modal-close').click(function () {
        location.reload();
        return false;
    });

    // Cancel an ongoing upload
    $('#upload-cancel').click(function () {
        cancelAlreadyUploaded();
    });
});

/**
 * Update the progress bar with upload percentage
 * @param {*} percent 
 */
function updateProgressBar(percent) {
    percent = Math.ceil(percent);
    $('#upload-progress-bar').css('width', percent + '%');
    $('#upload-progress-bar').html(percent + '%');
}

/**
 * Check the files size to be less than upload limit
 */
function checkFileSizes() {
    forbiddenLimit = false;
    $('#fileNames .alert').each(function (index) {
        let fileSize = fileList[index].size / 1e9; // Size in GB
        if (fileSize > uploadMaxLimit) {
            forbiddenLimit = true;
            $('#size-alert-id-' + index).show(); // Use file name to identify
        } else {
            $('#size-alert-id-' + index).hide();
        }
    });
}

/**
 * Upload a file to the server
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
    var csrf_value = $('meta[name=_csrf_token]').attr('content');
    formdata.append('_csrf_token', csrf_value);

    var oldProgress = 0;
    reqUpload.upload.addEventListener('progress', function (e) {
        let progress = (Math.ceil(e.loaded / (e.total * 1.1) * 100) / Max);
        uploadPercent += (progress - oldProgress);
        updateProgressBar(uploadPercent);
        oldProgress = progress;
    }, false);

    reqUpload.onreadystatechange = function () {
        if (reqUpload.readyState == XMLHttpRequest.DONE) {
            if (reqUpload.status === 200) {
                already_uploaded_count += 1;
                if (already_uploaded_count === Max) {
                    updateProgressBar(100);
                    window.location.replace(this.responseText);
                }
            } else {
                $('#progress-bar-container').hide();
                $('#upload-error-container').show();
                $('#upload-progress-modal-close').show();
            }
        }
    }

    reqUpload.open("POST", dest_url);
    reqUpload.send(formdata);
}

/**
 * Cancel uploaded files
 */
function cancelAlreadyUploaded() {
    $('#cancel_waiting').show();
    $('#progress-bar-container').hide();
    $('.modal-title').hide();
    for (let req of uploadReqs) {
        req.abort();
    }
    $('#upload-error-container').hide();
    $('#upload-progress-modal-close').hide();
    $('#upload-cancel').hide();

    already_uploaded_count = 0;
    uploadPercent = 0;
    let filenames = fileList.map(file => file.name);
    var formdata = new FormData();
    let cancel_url = $('#cancel_upload_url').val();
    formdata.set('pck_id', $('#pck_id').val());
    formdata.set('filenames', filenames);

    var req = new XMLHttpRequest();
    req.onreadystatechange = function () {
        if (req.readyState == XMLHttpRequest.DONE && req.status === 200) {
            $('#progress-modal').modal('hide');
        }
    }

    req.open("POST", cancel_url);
    req.send(formdata);
}

/**
 * File validity check
 * @returns 
 */
function fileValidity() {
    return fileList.length !== 0 && !forbiddenLimit;
}

/**
 * Empty the File box list
 */
function emptyFiles() {
    forbiddenLimit = false;
    $('#fileNames .alert').remove(); // Remove only alerts within the fileNames container
}