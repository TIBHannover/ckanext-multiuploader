/**
 * File upload handler (CKAN) - Bootstrap 5 compatible
 */

let uploadReqs = [];
let fileList = [];
let uploadPercent = 0;
let forbiddenLimit = false;
let nextUrl = null;

let dest_url = null;
let uploadMaxLimit = 0;

let totalUploads = 0;
let completedUploads = 0;
let successUploads = 0;
let anyUploadFailed = false;
let didFinish = false;

// Bootstrap 5 modal instance (created on demand)
let progressModal = null;

$(document).ready(function () {
  // Read config values once DOM is ready
  dest_url = $('#dest_url').val();
  uploadMaxLimit = parseFloat($('#upload_limit').val() || "0");
  if (!isFinite(uploadMaxLimit)) uploadMaxLimit = 0;

  // Hide things initially (optional but helps)
  $('#progress-bar-container').hide();
  $('#upload-error-container').hide();
  $('#cancel_waiting').hide();

  /**
   * Click the upload button -> open file picker
   */
  $('#UpBtn').on('click', function () {
    $('#fileUpload').trigger('click');
  });

  /**
   * Remove All
   */
  $("#RemoveBtn").on('click', function () {
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
   * When user selects files
   */
  $(document).on('change', '#fileUpload', function () {
    console.log("📁 [CHANGE] #fileUpload fired");

    const files = $("#fileUpload")[0].files;
    console.log("📦 Files detected:", files.length);

    // IMPORTANT: clear fileList so it doesn't double to 26, 39, ...
    fileList = [];
    emptyFiles();

    for (let i = 0; i < files.length; i++) {
      fileList.push(files[i]);
      console.log("➡️ Added file:", files[i].name, "size:", files[i].size);
    }

    const filesBox = $('#fileNames');
    $('#fileNameMessage').hide();

    for (let i = 0; i < fileList.length; i++) {
      const rowHtml = `
        <div class="row file-row">
          <div class="col-sm-12">
            <div class="fileItem" data-idx="${i}">${escapeHtml(fileList[i].name)} <i class="fa fa-close"></i></div>
            <span class="size-alert-span" id="size-alert-id-${i}" style="display:none;">
              <div class="size-alert"><p>File too big!</p></div>
            </span>
          </div>
        </div>
      `;
      filesBox.append(rowHtml);
    }

    console.log("📦 fileList length now:", fileList.length);

    checkFileSizes();
    $('#LinkBtn').hide();
    $('#RemoveBtn').show();
  });

  /**
   * Link upload instead of file
   */
  $('#LinkBtn').on('click', function () {
    $('#RemoveBtn').hide();
    $('.upload-related-parts').hide();
    $('#urlBox').show();
    $('#file-danger').hide();
  });

  /**
   * Remove URL
   */
  $('#urlRemove').on('click', function () {
    $('.upload-related-parts').show();
    $('#urlBox').hide();
    $('#file-danger').hide();
  });

  /**
   * Delete a single file row
   */
  $(document).on('click', '.file-row', function (e) {
    if (!$(e.target).is('i')) return;

    const idx = parseInt($(this).find('.fileItem').attr('data-idx'), 10);
    if (!Number.isFinite(idx)) return;

    fileList.splice(idx, 1);
    $(this).remove();

    // Re-render indices so deletes stay consistent
    rebuildFileRows();

    if ($('.file-row').length === 0) {
      forbiddenLimit = false;
      $('#file-danger-size').hide();
      // optionally re-open picker:
      // $('#UpBtn').click();
    } else {
      checkFileSizes();
      if (!forbiddenLimit) $('#file-danger-size').hide();
      $("#fileUpload")[0].value = '';
      // Do NOT trigger change again (it causes duplication & confusion)
    }
  });

  /**
   * Stop default CKAN form submit
   */
  $("#resource-edit").on('submit', function (e) {
    e.preventDefault();
    return false;
  });

  /**
   * Save button (upload start)
   */
  $('button[name="Csave"]').on('click', function () {
    console.log("🟢 [SAVE BUTTON] Clicked:", $(this).val());
    console.log("📦 fileList at click:", fileList.length);
    console.log("⛔ forbiddenLimit:", forbiddenLimit);

    const sBtn = $(this).val();

    if (sBtn === "go-dataset") {
      previous("go-dataset");
      return;
    }

    if ($('#urlBox:visible').length !== 0 && LinkValidity()) {
      uploadLink(sBtn);
      return;
    }

    if (fileValidity()) {
      // reset progress
      uploadReqs = [];
      uploadPercent = 0;
      updateProgressBar(0);

      totalUploads = fileList.length;
      completedUploads = 0;
      successUploads = 0;
      anyUploadFailed = false;
      didFinish = false;

      // modal UI state
      $('#cancel_waiting').hide();
      $('.modal-title').show();
      $('#upload-cancel').show();
      $('#upload-progress-modal-close').addClass('d-none');

      $('#progress-bar-container').show();
      $('#upload-error-container').hide();
      $('#file-danger-size').hide();
      console.log('MODAL SHOULD OPEN NOW');
      showProgressModal(); // ✅ Bootstrap 5 show

      for (let i = 0; i < fileList.length; i++) {
        uploadFiles(fileList[i], sBtn, totalUploads);
      }
    } else {
      if (forbiddenLimit) {
        $('#file-danger-size').show();
      } else {
        $('#file-danger').show();
        setTimeout(function () {
          $('#file-danger').hide();
        }, 10000);
      }
    }
  });

  /**
   * Close modal (you can keep reload if you want)
   */
  $('#upload-progress-modal-close').on('click', function () {
    location.reload();
    return false;
  });

  /**
   * Cancel upload
   */
  $('#upload-cancel').on('click', function () {
    cancelAlreadyUploaded();
  });

  /**
   * Drag & drop
   */
  $("html").on("dragover drop", function (e) {
    e.preventDefault();
    e.stopPropagation();
  });

  $('.module').on('dragover', function (e) {
    e.originalEvent.dataTransfer.dragEffect = "copyMove";
    e.originalEvent.dataTransfer.dropEffect = "copy";
    $('#fileNames').addClass('drag_over');
    return false;
  });

  $('.module').on('dragleave', function () {
    $('#fileNames').removeClass('drag_over');
    return false;
  });

  $('.module').on('drop', function (e) {
    e.preventDefault();
    $('#fileNames').removeClass('drag_over');

    $("#fileUpload")[0].files = e.originalEvent.dataTransfer.files;
    $("#fileUpload").trigger('change');
  });
});

/**
 * Bootstrap 5 modal show
 */
function showProgressModal() {
  const modalEl = document.getElementById('progress-modal');
  if (!modalEl) {
    console.error("progress-modal element not found");
    return;
  }
  if (typeof bootstrap === "undefined" || !bootstrap.Modal) {
    console.error("Bootstrap 5 JS not loaded (bootstrap.Modal missing). Make sure bootstrap.bundle.js is included.");
    return;
  }

  progressModal = bootstrap.Modal.getInstance(modalEl);
  if (!progressModal) {
    progressModal = new bootstrap.Modal(modalEl, {
      backdrop: 'static',
      keyboard: false
    });
  }
  progressModal.show();
}

/**
 * Bootstrap 5 modal hide
 */
function hideProgressModal() {
  const modalEl = document.getElementById('progress-modal');
  if (!modalEl || typeof bootstrap === "undefined" || !bootstrap.Modal) return;

  const inst = bootstrap.Modal.getInstance(modalEl);
  if (inst) inst.hide();
}

/**
 * Update progress bar (clamped 0..100)
 */
function updateProgressBar(percent) {
  percent = Math.max(0, Math.min(100, Math.round(percent)));
  $('#upload-progress-bar')
    .css('width', percent + '%')
    .attr('aria-valuenow', percent)
    .text(percent + '%');
}

/**
 * Check file sizes against limit (GB)
 */
function checkFileSizes() {
  forbiddenLimit = false;

  for (let i = 0; i < fileList.length; i++) {
    const fileSizeGb = fileList[i].size / 1000000000; // GB
    if (uploadMaxLimit > 0 && fileSizeGb > uploadMaxLimit) {
      forbiddenLimit = true;
      $('#size-alert-id-' + i).show();
    } else {
      $('#size-alert-id-' + i).hide();
    }
  }
}

/**
 * Upload a file
 */
function uploadFiles(file, action, maxFiles) {
  console.log("🚚 [UPLOAD] Started for:", file.name, "| action:", action, "| dest_url:", dest_url);

  const formdata = new FormData();
  const reqUpload = new XMLHttpRequest();
  uploadReqs.push(reqUpload);

  formdata.set('files', file);
  formdata.set('isLink', 0);
  formdata.set('pck_id', $('#pck_id').val());
  formdata.set('save', action);
  formdata.set('id', $('#id').val());
  formdata.set('description', $('#field-description').val());

  // csrf
  const csrf_value = $('meta[name=_csrf_token]').attr('content');
  if (csrf_value) formdata.append('csrf_token', csrf_value);

  let oldProgress = 0;

  reqUpload.upload.addEventListener('progress', function (e) {
    if (!e.lengthComputable) return;

    const perFile = 100 / maxFiles;                 // e.g. 7.69
    const filePortion = perFile * (e.loaded / e.total); // 0..perFile

    uploadPercent += (filePortion - oldProgress);
    oldProgress = filePortion;

    updateProgressBar(uploadPercent);
    console.log("📊 Upload progress:", Math.round(uploadPercent) + "%");
  }, false);

      reqUpload.onreadystatechange = function () {
      if (reqUpload.readyState !== XMLHttpRequest.DONE) return;

      completedUploads++;

      if (reqUpload.status === 200) {
        successUploads++;
        const resp = (reqUpload.responseText || '').trim();
        if (resp) nextUrl = resp;   // Python returns the URL
      } else {
        anyUploadFailed = true;

        // show error UI in modal
        $('#upload-error-container').show();
        $('#progress-bar-container').hide();
        $('#upload-cancel').hide();
        $('#upload-progress-modal-close').removeClass('d-none');
      }

      // When ALL uploads finished:
      if (completedUploads === totalUploads && !didFinish) {
        didFinish = true;
        // Only auto-close if ALL were successful
        if (!anyUploadFailed && successUploads === totalUploads) {
          updateProgressBar(100);
          hideProgressModal(); //Bootstrap 5 close

        if (nextUrl) {
            window.location.replace(nextUrl);   // go to dataset.read
            } else {
                location.reload();                  // fallback if server returned nothing
            }
        }
      }
  };

  reqUpload.open("POST", dest_url);
  reqUpload.send(formdata);
}

/**
 * Upload a link instead of a file
 */
function uploadLink(action) {
  const formdata = new FormData();
  formdata.set('url', $('#urlText').val());
  formdata.set('isLink', 1);
  formdata.set('pck_id', $('#pck_id').val());
  formdata.set('save', action);
  formdata.set('name', $('#urlName').val());
  formdata.set('id', $('#id').val());
  formdata.set('description', $('#field-description').val());

  const req = new XMLHttpRequest();
  req.onreadystatechange = function () {
    if (req.readyState === XMLHttpRequest.DONE && req.status === 200) {
      window.location.replace(req.responseText);
    }
  };

  req.open("POST", dest_url);
  req.send(formdata);
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
  }

  $('#upload-error-container').hide();
  $('#upload-progress-modal-close').hide();
  $('#upload-cancel').hide();

  const filenames = fileList.map(f => f.name);

  uploadPercent = 0;
  updateProgressBar(0);

  const formdata = new FormData();
  const cancelUrl = $('#cancel_upload_url').val();

  formdata.set('pck_id', $('#pck_id').val());
  formdata.set('filenames', JSON.stringify(filenames));

  const req = new XMLHttpRequest();
  req.onreadystatechange = function () {
    if (req.readyState === XMLHttpRequest.DONE && req.status === 200) {
      hideProgressModal(); // ✅ Bootstrap 5 hide
    }
  };

  req.open("POST", cancelUrl);
  req.send(formdata);
}

/**
 * Previous button (deprecated)
 */
function previous(action) {
  const formdata = new FormData();
  formdata.set('save', action);
  formdata.set('pck_id', $('#pck_id').val());

  const req = new XMLHttpRequest();
  req.onreadystatechange = function () {
    if (req.readyState === XMLHttpRequest.DONE && req.status === 200) {
      window.location.replace(req.responseText);
    }
  };

  req.open("POST", dest_url);
  req.send(formdata);
}

/**
 * Validations
 */
function fileValidity() {
  const valid = (fileList.length !== 0 && !forbiddenLimit);
  console.log("🔍 [fileValidity] valid:", valid, "| fileList:", fileList.length, "| forbiddenLimit:", forbiddenLimit);
  return valid;
}

function LinkValidity() {
  return ($('#urlText').val() || '') !== '';
}

/**
 * empty the File box list (DOM only)
 */
function emptyFiles() {
  forbiddenLimit = false;
  $('.file-row').remove();
}

/**
 * After deleting rows, rebuild the list UI indices so remove works
 */
function rebuildFileRows() {
  // Clear UI and redraw from current fileList
  emptyFiles();
  const filesBox = $('#fileNames');

  for (let i = 0; i < fileList.length; i++) {
    const rowHtml = `
      <div class="row file-row">
        <div class="col-sm-12">
          <div class="fileItem" data-idx="${i}">${escapeHtml(fileList[i].name)} <i class="fa fa-close"></i></div>
          <span class="size-alert-span" id="size-alert-id-${i}" style="display:none;">
            <div class="size-alert"><p>File too big!</p></div>
          </span>
        </div>
      </div>
    `;
    filesBox.append(rowHtml);
  }
}

/**
 * Basic HTML escape for filenames
 */
function escapeHtml(str) {
  return String(str)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}
