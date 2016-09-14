var app = require('express')();
var server = require('http').Server(app);
var port = 1337;

app.get('/', function (req, res) {
    res.sendFile(__dirname + '/client/index.html');
});

server.listen(port);

var io = require('socket.io')(server);
io.sockets.on('connection', function (socket) {
    console.log('Someone has connected');
    
    socket.on('MessageToServer', function (data) {
        console.log('Someone clicked the button');
    });
});
