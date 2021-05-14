$(document).ready(function(){
    $('#UpBtn').on('click', function() {    
        if ($('#UpBtn').hasClass('uploaded')){
            $('#LinkBtn').show();
            $('#UpBtn').css('background-color', 'white');
            $('#UpBtn').css('color', 'black');
            $('#UpBtn').css('width', '80px');
            $('#UpBtn').text('Upload');
            $('#UpBtn').removeClass('uploaded');
            $('#fileUpload').val('');
        }
        else{
            $('#fileUpload').trigger('click');
        }            
    });

    $("#fileUpload").change(function(){
        var files = $("#fileUpload")[0].files;
        for (var i = 0; i < files.length; i++)
        {
            console.info(files[i].name);
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

});

