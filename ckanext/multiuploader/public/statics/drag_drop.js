$(document).ready(function () {
    $("html").on("dragover", function (e) {
        e.preventDefault();
        e.stopPropagation();
    });
 
    $("html").on("drop", function (e) {
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