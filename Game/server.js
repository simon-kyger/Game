var express = require('express');
var app = express();
var server = require('http').Server(app);
var port = 1337;

app.get('/', function (req, res) {
    res.sendFile(__dirname + '/client/index.html');
});

server.listen(port);