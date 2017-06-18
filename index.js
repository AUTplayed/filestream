//External Dependencies
var express = require('express');
var app = express();
var path = require('path');
var expressWs = require('express-ws')(app);
var sha1 = require('sha1');
var wsmap = new Map();

//Internal Dependencies

//Declarations

app.use(express.static(__dirname + '/public'));

app.get("/:hash",function(req,res){
    res.sendFile(path.join(__dirname + '/public/index.html'));
});

app.ws('/ws',function(ws){
    var hash;
    ws.on('message',function(msg){
        msg = JSON.parse(msg);
        //console.log(msg);
        if(msg.type === "data"){
            wsmap.get(hash).receiver.send(JSON.stringify(msg));
        }else if(msg.type === "meta"){
            hash = sha1(msg.data);
            hash = hash.substring(0,8);
            var response = {};
            response.type = "meta";
            response.data = hash;
            ws.send(JSON.stringify(response));
            wsmap.set(hash,{sender:ws,meta:msg.data});
        }else if(msg.type === "start"){
            var entry = wsmap.get(msg.data);
            setTimeout(function(){entry.sender.send(JSON.stringify({type:"start"}));},500);
            entry.receiver = ws;
            ws.send(JSON.stringify({type:"meta",data:entry.meta}));
        }else if(msg.type === "finished"){
            var receiver = wsmap.get(hash).receiver;
            receiver.send(JSON.stringify(msg));
        }
    });
});

app.listen(process.env.PORT || 8080);