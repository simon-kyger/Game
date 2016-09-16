var express = require('express');
var app = express();
var server = require('http').Server(app);
var port = 1338;
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
        x: 128,
        y: 64,
        id: id,
        number: Math.floor(10 * Math.Random),
        dirUp: false,
        dirDown: false,
        dirLeft: false,
        dirRight: false,
        dir: 'right',
        spd: 0,
        frame: 0
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
    
    socket.on('keypress', function (data) {
        if (data.inputId === 'up') {
            player.dirUp = data.state;
            if (data.state)
                player.spd = 2;
            else
                player.spd = 0;
        }
        if (data.inputId === 'down') {
            player.dirDown = data.state;
            if (data.state)
                player.spd = 2;
            else
                player.spd = 0;
        }
        if (data.inputId === 'left') {
            player.dirLeft = data.state;
            player.dir = data.inputId;
            if (data.state)
                player.spd = 2;
            else
                player.spd = 0;
        }
        if (data.inputId === 'right') {
            player.dirRight = data.state;
            player.dir = data.inputId;
            if (data.state)
                player.spd = 2;
            else
                player.spd = 0;
        }
    });

    socket.on('disconnect', function () {
        delete SOCKET_CONNECTIONS[socket.id];
        console.log('Someone disconnected');
        delete PLAYER_LIST[socket.id];
    });
});

var map = [
    //[0, 0, 0, 0, 0, 1, 1, 0, 1, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0],
    //[0, 0, 1, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 0, 1],
    //[0, 0, 0, 0, 1, 0, 0, 1, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1],
    //[0, 0, 0, 1, 0, 1, 1, 0, 1, 1, 1, 0, 0, 1, 1, 1, 0, 0, 0],
    //[0, 1, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 1, 0, 0],
    //[0, 0, 0, 1, 0, 0, 1, 0, 1, 0, 0, 0, 0, 1, 1, 0, 1, 0, 0],
    //[0, 0, 0, 0, 1, 1, 0, 0, 0, 0, 0, 0, 1, 0, 1, 0, 1, 0, 0],
    //[0, 1, 0, 0, 0, 0, 0, 0, 1, 0, 0, 1, 0, 0, 0, 1, 0, 0, 1],
    //[0, 0, 0, 1, 0, 1, 0, 0, 0, 1, 0, 1, 0, 0, 0, 1, 0, 1, 0],
    //[1, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 1]
];

var mapoverlay = [
    [6, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 6, 0, 3, 7, 0, 0, 0],
    [0, 6, 5, 0, 1, 0, 0, 0, 0, 7, 6, 0, 0, 0, 0, 0, 1, 0, 0],
    [0, 2, 1, 0, 0, 0, 0, 0, 1, 0, 0, 1, 0, 0, 0, 1, 0, 0, 6],
    [0, 0, 0, 0, 3, 1, 0, 0, 0, 0, 0, 0, 5, 0, 0, 2, 0, 0, 0],
    [1, 0, 0, 5, 0, 2, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 0],
    [0, 0, 3, 0, 0, 0, 4, 1, 4, 2, 0, 0, 3, 0, 0, 0, 0, 0, 0],
    [0, 0, 3, 3, 0, 0, 0, 3, 0, 0, 0, 0, 0, 0, 0, 6, 1, 2, 2],
    [2, 1, 0, 1, 0, 4, 0, 0, 2, 0, 2, 3, 0, 0, 1, 1, 0, 0, 2],
    [0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
    [1, 0, 0, 0, 0, 0, 7, 1, 0, 0, 0, 0, 2, 0, 6, 0, 0, 1, 0]
];

setInterval(function () {
    var data = [];
    for (var i in PLAYER_LIST) {
        var player = PLAYER_LIST[i];
        player.updatePosition();
        if (player.frame > 3)
            player.frame = 0;
        data.push({
            id: player.id,
            x: player.x,
            y: player.y,
            dir: player.dir,
            spd: player.spd,
            frame: player.frame,
            map: map,
            mapoverlay: mapoverlay
        });
        player.frame++;
    }
    for (var i in SOCKET_CONNECTIONS) {
        var socket = SOCKET_CONNECTIONS[i];
        socket.emit('positionalData', data);
    }
}, 1000/20);
