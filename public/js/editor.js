$(document).ready(function(){
  
  var QueryString = function () {
    var query_string = {};
    var query = window.location.search.substring(1);
    var vars = query.split("&");
    for (var i=0;i<vars.length;i++) {
        var pair = vars[i].split("=");
        if (typeof query_string[pair[0]] === "undefined") {
            query_string[pair[0]] = pair[1];
        } else if (typeof query_string[pair[0]] === "string") {
            var arr = [ query_string[pair[0]], pair[1] ];
            query_string[pair[0]] = arr;
        } else {
            query_string[pair[0]].push(pair[1]);
        }
    } 
      return query_string;
  } ();


  // Setear el nombre del archivo
  $('#file-name').text(QueryString.name);
  

  // Obtener datos del archivo
  $('#loader-wrapper').fadeIn();
  $.get(QueryString.url, function(data){
    if (data.status === "ok"){
      $('#text-editor').html(data.file_content);
    } else {
      $('#text-editor').html("Error al cargar archivo...");
    }
    $('#loader-wrapper').fadeOut();
  });
  

  // Guardar el archivo
  $('#bt-guardar').click(function(){
    $('#loader-wrapper').fadeIn();
    $.post(QueryString.url, {file_content:$('#text-editor').val()}, function(data){
        if (data.status == "ok"){
            $("#guardado-exito").fadeIn();
            setTimeout(function(){ $("#guardado-exito").fadeOut(); }, 5000);
        } else {
            $("#guardado-error").fadeIn();
            setTimeout(function(){ $("#guardado-error").fadeOut(); }, 5000);
        }
      $('#loader-wrapper').fadeOut();
    });
  });


  // Salir del documento
  $('#bt-salir').click(function(){
    window.close();
  });

  
});