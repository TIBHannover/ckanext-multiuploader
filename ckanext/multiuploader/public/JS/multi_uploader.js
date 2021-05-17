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
        var isValid = formValidity();
        if (isValid) {
            jQuery.ajax({
                type: "POST",
                url: "/multiuploader/upload_resources",
                dataType: "html",
                data: {'description': $('#field-description').val(), 'files':fileList},
                success: function (result) {
                    console.log(result);
                }
            });
        }
        e.preventDefault();
        return false;
    });

});

function formValidity(){
    if($("#fileUpload")[0].files){
        return true;
    }
    return false
}