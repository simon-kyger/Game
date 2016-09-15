var express = require('express');
var app = express();
var server = require('http').Server(app);
var port = 1337;
var io = require('socket.io')(server);

//routes
app.get('/', function (req, res) {
    res.sendFile(__dirname + '/client/index.html');
});
app.use('/client', express.static(__dirname + '/client'));

//on
server.listen(port);

//abstracts
var PLAYER_LIST = {};
var Player = function (id) {
    var self = {
        x: 0,
        y: 0,
        id: id,
        number: Math.floor(10 * Math.Random),
        dirUp: false,
        dirDown: false,
        dirLeft: false,
        dirRight: false,
        spd: 10
    }
    self.updatePosition = function() {
        if (self.dirUp)
            self.y -= self.spd;
        if (self.dirDown)
            self.y += self.spd;
        if (self.dirLeft)
            self.x -= self.spd;
        if (self.dirRight)
            self.x += self.spd;
    }
    return self;
}

//upon connection
var SOCKET_CONNECTIONS = {};
var UNIQUEID = 0;
io.sockets.on('connection', function (socket) {
    socket.id = UNIQUEID;
    UNIQUEID++;
    SOCKET_CONNECTIONS[socket.id] = socket;
    var player = Player(socket.id);
    PLAYER_LIST[socket.id] = player;

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
    
    socket.on('keypress', function (data) {
        if (data.inputId === 'up')
            player.dirUp = data.state;
        if (data.inputId === 'down')
            player.dirDown = data.state;
        if (data.inputId === 'left')
            player.dirLeft = data.state;
        if (data.inputId === 'right')
            player.dirRight = data.state;
    });

    socket.on('disconnect', function () {
        delete SOCKET_CONNECTIONS[socket.id];
        console.log('Someone disconnected');
        delete PLAYER_LIST[socket.id];
    });
});

setInterval(function () {
    var data = [];
    for (var i in PLAYER_LIST) {
        var player = PLAYER_LIST[i];
        player.updatePosition();
        data.push({
            id: player.id,
            x: player.x,
            y: player.y
        });
    }
    for (var i in SOCKET_CONNECTIONS) {
        var socket = SOCKET_CONNECTIONS[i];
        socket.emit('positionalData', data);
    }
}, 1000/30);
