/**
 * The code is responsilbe for handling a file upload process with drag and drop.
 * 
 * Author: p.oladazimi 
 */

var fileList = [];
var dest_url = $('#dest_url').val();
var test_test = "";
var uploadPercent = 0;
var forbiddenLimit = false;
var already_uploaded_count = 0;
$(document).ready(function(){
    $('#UpBtn').on('click', function() {     // click the upload/remove button
        if ($('#UpBtn').hasClass('uploaded')){ // Remove all files (file are already added to the file box)
            $('#LinkBtn').show();
            $('#UpBtn').css('background-color', 'white');
            $('#UpBtn').css('color', 'black');
            $('#UpBtn').css('width', '80px');
            $('#UpBtn').text('Upload');
            $('#UpBtn').removeClass('uploaded');
            $('#fileUpload').val('');
            $('#fileNameMessage').show();            
            fileList = [];
            emptyFiles();       
        }
        else{
            $('#fileUpload').trigger('click'); // upload files
        }            
    });

    $("#fileUpload").change(function(){ // triggers when the user adds a new file(s)
        var files = $("#fileUpload")[0].files;
        emptyFiles();  
        for (var i = 0; i < files.length; i++)
        {
            fileList.push(files[i]);
        }       
        var filesBox = $('#fileNames');
        $('#fileNameMessage').hide();
        let elem = "<div class='row file-row'><div class='col-sm-12'><span>First</span><span class='size-alert-span' id='SIZE_ALERT_ID'>Second</span></div></div>";
        for (var i = 0; i < fileList.length; i++)
        {
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
        $('#UpBtn').css('background-color', 'red');
        $('#UpBtn').css('color', 'white');
        $('#UpBtn').css('width', '110px');
        $('#UpBtn').text('Remove all');
        $('#UpBtn').addClass('uploaded');

    });

    $('#LinkBtn').click(function(){ // No file upload, add a link instead of a data file
        $('#UpBtn').hide();
        $('#fileNameBox').hide();
        $('#urlBox').show();
        $(this).hide();
        $('#file-danger').hide();
    });
    $('#urlRemove').click(function(){ // remove the added url
        $('#UpBtn').show();
        $('#LinkBtn').show();
        $('#fileNameBox').show();
        $('#urlBox').hide();
        $('#file-danger').hide();        
    });

    $(document).on('click', '.file-row', function(e){ // delete an already added file 
        if($(e.target).is('i')){
            let idx = parseInt($(this).find('.fileItem').eq(0).attr('id')); 
            fileList.splice(idx, 1);            
            $(this).remove();
            if($('.file-row').length === 0){
                forbiddenLimit = false;
                $('#UpBtn').click();
            }
            else{
                $("#fileUpload")[0].value = '';
                $('#fileUpload').trigger("change");
            }
        } 

    });

    $("#resource-edit").bind('submit', function (e) { // stop the default CKAN form submitting 
        e.preventDefault();
        return false;
    });

    $('button[name="Csave"]').click(function(){    // clicks on the Add button     
        var sBtn = $(this).val();
        if($(this).val() === "go-dataset"){
            previous("go-dataset"); // previous step (dataset metadat page)
            return 0;
        }            
        if($('#urlBox:visible').length !== 0 && LinkValidity()){ // Link upload (not file)
            uploadLink(sBtn);
            return 0;
        }            
        var file_counter = 1;         
        if(fileValidity()){ 
            $('#file-danger-size').hide();
            $('#progress-modal').modal({
                backdrop: 'static',
                keyboard: false,
                show: true 
            });           
            for(var i = 0; i < fileList.length; i++){            
                uploadFiles(fileList[i], sBtn, fileList.length); // upload a file
                file_counter ++;          
            } 
        }
        else{ 
            if(forbiddenLimit){
                // passed the size limit
                $('#file-danger-size').show();
            }
            else{
                // no file is selected            
                $('#file-danger').show();
                setTimeout(function(){
                    $('#file-danger').hide();
                }, 10000);
            }
        }             
    });   

    $('#upload-progress-modal-close').click(function(){
        location.reload();
        return false;
    });


});

/**
 * update the progress bar with upload percentage
 * @param {*} percent 
 */
function updateProgressBar(percent){ 
    $('#upload-progress-bar').css('width', percent + '%');
    $('#upload-progress-bar').html(percent + '%');
}



/**
 * check the files size to be less than upload limit
 */
function checkFileSizes(){ 
    forbiddenLimit = false;     
    for (var i = 0; i < fileList.length; i++)
        {
            fileSize = fileList[i].size / 1000000000; // Size in GB
            if (fileSize > 2){
                forbiddenLimit = true;
                 $('#size-alert-id-' + i).show();
            }
        }
}

/**
 * Upload a file to server
 * 
 */
function uploadFiles(file, action, Max){    
    var formdata = new FormData();
    formdata.set('files', file);
    formdata.set('isLink', 0);
    formdata.set('pck_id', $('#pck_id').val());
    formdata.set('save', action);
    formdata.set('id', $('#id').val());
    formdata.set('description', $('#field-description').val());
    var req = new XMLHttpRequest();
    var oldProgress = 0;
    req.upload.addEventListener('progress', function(e){
        let progress = (Math.ceil(e.loaded/(e.total * 1.1) * 100) / Max);
        uploadPercent += (progress - oldProgress)
        updateProgressBar(uploadPercent);
        oldProgress = progress
    }, false);
    req.onreadystatechange = function() {
        if (req.readyState == XMLHttpRequest.DONE && req.status === 200) {      
            already_uploaded_count += 1; 
            if (already_uploaded_count === Max){
                updateProgressBar(100);
                 window.location.replace(this.responseText);
            }                   
            
        }
        else if (req.readyState == XMLHttpRequest.DONE && req.status !== 200){
            $('#progress-bar-container').hide();
            $('#upload-error-container').show();
            $('#upload-progress-modal-close').show();
        }
    }
    req.open("POST", dest_url)
    req.send(formdata)
    return 0;
}

/**
 * 
 * Upload a link instaed of a file
 */
function uploadLink(action){
    var formdata = new FormData();
    formdata.set('url', $('#urlText').val());
    formdata.set('isLink', 1);
    formdata.set('pck_id', $('#pck_id').val());
    formdata.set('save', action);
    formdata.set('name', $('#urlName').val());
    formdata.set('id', $('#id').val());
    formdata.set('description', $('#field-description').val());
    var req = new XMLHttpRequest();
    req.onreadystatechange = function() {
        if (req.readyState == XMLHttpRequest.DONE && req.status === 200) {       
            window.location.replace(this.responseText);                                 
        }
    }
    req.open("POST", dest_url)
    req.send(formdata)
    return 0;
}

/**
 * 
 * when click the previous button (deprecated)
 */
function previous(action){
    var formdata = new FormData();
    formdata.set('save', action);
    formdata.set('pck_id', $('#pck_id').val());
    var req = new XMLHttpRequest();
    req.onreadystatechange = function() {
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
function fileValidity(){
    if(fileList.length !==0 && !forbiddenLimit){
        return true;
    }
    return false
}

/**
 * Link added by the user or not
 * @returns 
 */
function LinkValidity(){
    if($('#urlText').val() !== ''){
        return true;
    }
    return false
}

/**
 * empty the File box list
 */
function emptyFiles(){
    forbiddenLimit = false;
    let items = $('.file-row');
        for(var i=0; i<items.length;i++){
            items[i].remove();
    }   
}
