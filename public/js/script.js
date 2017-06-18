$(document).ready(function () {
    ws = new WebSocket("ws://" + window.location.host + "/ws");
    if(window.location.pathname !== "/" ){
        $("#upload").hide();
        ws.onmessage = downloader;
        ws.onopen = start;
    }else{
        $("#download").hide();
        ws.onmessage = incoming;
    }
});
var ws;
var file;
var CHUNKSIZE = 1028*1028;
window.requestFileSystem  = window.requestFileSystem || window.webkitRequestFileSystem;
$("#dropfile").on("dragover dragenter", function (e) {
    e.preventDefault();
    e.stopPropagation();
    $("#dropfile").addClass("dragover");
    $("#textwrapper").html("release now lol");
});
$("#dropfile").on("dragleave dragend drop", function (e) {
    e.preventDefault();
    e.stopPropagation();
    $("#dropfile").removeClass("dragover");
    $("#textwrapper").html("drop files here lol");
});

$("#dropfile").on("drop", function (e) {
    e.preventDefault();
    e.stopPropagation();
    $("#spinner").css("display", "flex");
    var files = e.originalEvent.dataTransfer.files;
    file = files[0]; //fuck multi-upload
    meta(file);
});

function meta() {
    ws.send(JSON.stringify({ type: "meta", data: file.name +' '+ file.size }));
}

function incoming(msgEv) {
    var msg = JSON.parse(msgEv.data);
    console.log(msg);
    if(msg.type === "start"){
        streamFile();
    }
}

function streamFile() {
    $("#spinner").show();
    var reader = new FileReader();
    streamFileRec(reader, 0, CHUNKSIZE);
}

function streamFileRec(reader, start, end) {
    reader.onload = function (e) {
        var data = e.target.result.split(",")[1];
        digest(data);
        //delete data;
        if (end == file.size) {
            finishedRead();
            return;
        } else {
            if (end + CHUNKSIZE > file.size) {
                streamFileRec(reader, end, file.size);
            } else {
                streamFileRec(reader, end, end + CHUNKSIZE);
            }
        }
    };
    reader.readAsDataURL(file.slice(start, end));
}

function digest(data){
    //console.log(data);
    var msg = {type:"data"};
    msg.data = data;
    ws.send(JSON.stringify(msg));
}

function finishedRead(){
    ws.send(JSON.stringify({type:"finished"}));
    $("#spinner").hide();
}

var fileEntry;
var time;
function downloader(msgEv) {
    var msg = JSON.parse(msgEv.data);
    //console.log(msg);
    if(msg.type === "data"){
        spit(msg.data);
    }else if(msg.type === "meta"){
        $("#meta").html(msg.data);
        var split = msg.data.split(" ");
        window.requestFileSystem(window.TEMPORARY,parseInt(split.pop()),function(fs){
            fs.root.getFile(split.join(" "),{create:true},function(fe){
                fileEntry = fe;
            },function(e){
                msg.log(e);
            });
        },function(e){
            msg.log(e);
        });
        time = Date.now();
    }else if(msg.type === "finished"){
        finishedWrite();
    }
}

function spit(data){
    fileEntry.createWriter(function(fw){
        fw.seek(fw.length);
        var blob = new Blob([atob(data)]);
        fw.write(blob);
    },function(e){
        console.log(e);
    });
}

function finishedWrite(){
    console.log(Date.now()-time);
    $("#dl").attr("download",fileEntry.name);
    $("#dl").attr("src",fileEntry.toURL());

}

function start(){
    var hash = window.location.pathname.substring(1,window.location.pathname.length);
    ws.send(JSON.stringify({type:"start",data:hash}));
}
