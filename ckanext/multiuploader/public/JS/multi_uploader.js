var fileList = [];
$(document).ready(function(){
    $('#UpBtn').on('click', function() {    
        if ($('#UpBtn').hasClass('uploaded')){ // Remove all files
            $('#LinkBtn').show();
            $('#UpBtn').css('background-color', 'white');
            $('#UpBtn').css('color', 'black');
            $('#UpBtn').css('width', '80px');
            $('#UpBtn').text('Upload');
            $('#UpBtn').removeClass('uploaded');
            $('#fileUpload').val('');
            fileList = [];
            $('#fileNames').empty();            
        }
        else{
            $('#fileUpload').trigger('click');
        }            
    });

    $("#fileUpload").change(function(){
        var files = $("#fileUpload")[0].files;
        var obj = {};
        for (var i = 0; i < files.length; i++)
        {
            fileList.push(files[i]);
        }       
        var filesBox = $('#fileNames');
        let elem = "<div class='fileItem' id='ID'>FILE  <i class='fa fa-close'></i></div>";
        for (var i = 0; i < fileList.length; i++)
        {
            elem = elem.replace('ID', i);
            elem = elem.replace('FILE', fileList[i].name);
            filesBox.append(elem);
            elem = "<div class='fileItem' id='ID'>FILE  <i class='fa fa-close'></i></div>";

        }
        $('#LinkBtn').hide();
        $('#UpBtn').css('background-color', 'red');
        $('#UpBtn').css('color', 'white');
        $('#UpBtn').css('width', '110px');
        $('#UpBtn').text('Remove all');
        $('#UpBtn').addClass('uploaded');

    });

    $('#LinkBtn').click(function(){
        $('#UpBtn').hide();
        $('#urlBox').show();
        $(this).hide();
    });
    $('#urlRemove').click(function(){
        $('#UpBtn').show();
        $('#LinkBtn').show();
        $('#urlBox').hide();        
    });

    $(document).on('click', '.fileItem', function(e){
        if($(e.target).is('i')){
            let idx = parseInt($(this).attr('id')); 
            fileList.splice(idx, 1);
            $(this).remove();

        }
        if($('.fileItem').length === 0){
            $('#UpBtn').click();
        }

    });

    $("#resource-edit").bind('submit', function (e) {
        e.preventDefault();
        return false;
    });

    $('button[name="save"]').click(function(){
        if($(this).val() === "go-dataset"){
            previous("go-dataset"); // previous (dataset metadat page)
            return 0;
        }
        var isValid = formValidity();
        var sBtn = $(this).val();
        var file_counter = 1;        
        for(var i = 0; i < fileList.length; i++){
            if(isValid){
               uploadFiles(fileList[i], sBtn, file_counter, fileList.length);
               file_counter ++;
            }
        }                 
    });
    
});

function uploadFiles(file, action, counter, Max){    
    var formdata = new FormData();
    formdata.set('files', file);
    formdata.set('pck_id', $('#pck_id').val());
    formdata.set('save', action);
    formdata.set('id', $('#id').val());
    formdata.set('description', $('#field-description').val());
    var req = new XMLHttpRequest();
    req.onreadystatechange = function() {
        if (req.readyState == XMLHttpRequest.DONE && req.status === 200) {       
            if (counter === Max){
                window.location.replace(this.responseText);  
            }                   
            
        }
    }
    req.open("POST", "/multiuploader/upload_resources")
    req.send(formdata)
    return 0;
}

function uploadLink(){
    var formdata = new FormData();
    formdata.set('url', $('#urlText').val());
    formdata.set('pck_id', $('#pck_id').val());
    formdata.set('save', action);
    formdata.set('id', $('#id').val());
    formdata.set('description', $('#field-description').val());
    var req = new XMLHttpRequest();
    req.onreadystatechange = function() {
        if (req.readyState == XMLHttpRequest.DONE && req.status === 200) {       
            window.location.replace(this.responseText);                                 
        }
    }
    req.open("POST", "/multiuploader/upload_resources")
    req.send(formdata)
    return 0;
}

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
    req.open("POST", "/multiuploader/upload_resources")
    req.send(formdata)
    return 0;
}

function formValidity(){
    if($("#fileUpload")[0].files){
        return true;
    }
    return false
}