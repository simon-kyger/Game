var app = require('express')();
var server = require('http').Server(app);
var port = 1337;

app.get('/', function (req, res) {
    res.sendFile(__dirname + '/client/index.html');
});

server.listen(port);

var io = require('socket.io')(server);

//upon connection
io.sockets.on('connection', function (socket) {

    //send a message to node console on server
    console.log('Someone has connected');

    //upon MessageToServer() triggering from client
    socket.on('MessageToServer', function (data) {
        
        //log that we got it here on the server
        console.log('Someone clicked the button');
        
        //but also send a message back to the client console
        socket.emit('MessageFromServer', {
            msg: 'Hello from the Server!',
        });
    });
});
