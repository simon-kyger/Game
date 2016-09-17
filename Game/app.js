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

//player Class
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
    Player.List[id] = self;
    return self;
}
Player.List = {};
Player.onConnect = function (socket) {
    var player = Player(socket.id);
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
}
Player.onDisconnect = function (socket) {
    delete Player.list[socket.id];
}
Player.update = function () {
    var data = [];
    for (var i in Player.List) {
        var player = Player.List[i];
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
    return data;
}

//upon connection
var SOCKET_CONNECTIONS = {};
var UNIQUEID = 0;
io.sockets.on('connection', function (socket) {
    socket.id = UNIQUEID;
    UNIQUEID++;
    SOCKET_CONNECTIONS[socket.id] = socket;
    Player.onConnect(socket);
    //send a message to node console on server
    console.log('Someone has connected');
    socket.on('disconnect', function () {
        delete SOCKET_CONNECTIONS[socket.id];
        console.log('Someone disconnected');
        delete Player.List[socket.id];
    });
    socket.on('chatMsg', function (message) {
        var playerid = ("" + socket.id);
        for (var i in SOCKET_CONNECTIONS) {
            SOCKET_CONNECTIONS[i].emit('addToChat', playerid + ': ' + message);
        }
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
    //[1, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 1],
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
    var pack = Player.update();
    for (var i in SOCKET_CONNECTIONS) {
        var socket = SOCKET_CONNECTIONS[i];
        socket.emit('positionalData', pack);
    }
}, 50); //20fps
