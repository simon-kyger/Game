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
        x: 0,
        y: 0,
        id: id,
        dirUp: false,
        dirDown: false,
        dirLeft: false,
        dirRight: false,
        dir: 'left',
        spdy: 0,
        spdx: 0,
        frame: 0,
        map: map,
        mapOverlay: mapOverlay,
        pclass: 'warrior',
        img: '/client/sprites/warrior.png',
    }
    self.updatePosition = function() {
        if (self.dirUp) {
            self.y -= self.spdy;
        }
        if (self.dirDown) {
            self.y += self.spdy;
        }
        if (self.dirLeft) {
            self.x -= self.spdx;
            self.dir = 'left';
        }
        if (self.dirRight) {
            self.x += self.spdx;
            self.dir = 'right';
        }

    }  
    self.getInitPack = function() {
        return {
            id: self.id,
            x: self.x,
            y: self.y,
            dirUp: self.dirUp,
            dirDown: self.dirDown,
            dirLeft: self.dirLeft,
            dirRight: self.dirRight,
            dir: self.dir,
            spdx: self.spdx,
            spdy: self.spdy,
            frame: self.frame,
            map: self.map,
            mapOverlay: self.mapOverlay,
            pclass: self.pclass,
        };
    }
    self.getUpdatePack = function () {
        return {
            id: self.id,
            x: self.x,
            y: self.y,
            dir: self.dir,
            spdx: self.spdx,
            spdy: self.spdy
        };
    }

    Player.list[id] = self;
    initPack.player.push(self.getInitPack());
    return self;
}
Player.list = {};
Player.onConnect = function (socket) {
    var player = Player(socket.id);
    socket.on('keypress', function (data) {
        if (data.inputId === 'up') {
            player.dirUp = data.state;
            if (data.state)
                player.spdy = 2;
            else
                player.spdy = 0;
        }
        if (data.inputId === 'down') {
            player.dirDown = data.state;
            if (data.state)
                player.spdy = 2;
            else
                player.spdy = 0;
        }
        if (data.inputId === 'left') {
            player.dirLeft = data.state;
            player.dir = data.inputId;
            if (data.state)
                player.spdx = 2;
            else
                player.spdx = 0;
        }
        if (data.inputId === 'right') {
            player.dirRight = data.state;
            player.dir = data.inputId;
            if (data.state)
                player.spdx = 2;
            else
                player.spdx = 0;
        }
    });

    socket.emit('init', {
        selfId: socket.id,
        player: Player.getAllInitPack()
    });
}
Player.getAllInitPack = function () {
    var players = [];
    for (var i in Player.list)
        players.push(Player.list[i].getInitPack());
    return players;
}
Player.onDisconnect = function (socket) {
    delete Player.list[socket.id];
    removePack.player.push(socket.id);
}
Player.update = function () {
    var data = [];
    for (var i in Player.list) {
        var player = Player.list[i];
        player.updatePosition();
        data.push(player.getUpdatePack());
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
    //send a message to node console on server and to the clients
    console.log(socket.id + ' has connected.');
    for (var i in SOCKET_CONNECTIONS)
        SOCKET_CONNECTIONS[i].emit('addToChat', socket.id + ' has connected.');
    socket.on('disconnect', function () {
        var playerid = ("" + socket.id);
        for (var i in SOCKET_CONNECTIONS)
            SOCKET_CONNECTIONS[i].emit('addToChat', socket.id + ' has disconnected.');
        console.log('Player: ' + socket.id + ' has disconnected.');
        Player.onDisconnect(socket);
        delete SOCKET_CONNECTIONS[socket.id];
    });
    socket.on('chatMsg', function (message) {
        var playerid = ("" + socket.id);
        for (var i in SOCKET_CONNECTIONS) {
            SOCKET_CONNECTIONS[i].emit('addToChat', playerid + ': ' + message);
        }
    });   
});

var map = [
    [0, 0, 0, 0, 0, 1, 1, 0, 1, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0],
    [0, 0, 1, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 0, 1],
    [0, 0, 0, 0, 1, 0, 0, 1, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1],
    [0, 0, 0, 1, 0, 1, 1, 0, 1, 1, 1, 0, 0, 1, 1, 1, 0, 0, 0],
    [0, 1, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 1, 0, 0],
    [0, 0, 0, 1, 0, 0, 1, 0, 1, 0, 0, 0, 0, 1, 1, 0, 1, 0, 0],
    [0, 0, 0, 0, 1, 1, 0, 0, 0, 0, 0, 0, 1, 0, 1, 0, 1, 0, 0],
    [0, 1, 0, 0, 0, 0, 0, 0, 1, 0, 0, 1, 0, 0, 0, 1, 0, 0, 1],
    [0, 0, 0, 1, 0, 1, 0, 0, 0, 1, 0, 1, 0, 0, 0, 1, 0, 1, 0],
    [1, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 1],
    [1, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 1],
    [1, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 1],
    [1, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 1],
    [1, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 1],
    [1, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 1],
    [1, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 1],
];

var mapOverlay = [
    [0, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 6, 0, 3, 7, 0, 0, 0],
    [0, 0, 0, 0, 1, 0, 0, 0, 0, 7, 6, 0, 0, 0, 0, 0, 1, 0, 0],
    [0, 0, 1, 0, 0, 0, 0, 0, 1, 0, 0, 1, 0, 0, 0, 1, 0, 0, 6],
    [0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 5, 0, 0, 2, 0, 0, 0],
    [1, 0, 0, 5, 0, 2, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 0],
    [0, 0, 3, 0, 0, 0, 4, 1, 4, 2, 0, 0, 3, 0, 0, 0, 0, 0, 0],
    [0, 0, 3, 3, 0, 0, 0, 3, 0, 0, 0, 0, 0, 0, 0, 6, 1, 2, 2],
    [2, 1, 0, 1, 0, 4, 0, 0, 2, 0, 2, 3, 0, 0, 1, 1, 0, 0, 2],
    [0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
    [1, 0, 0, 0, 0, 0, 7, 1, 0, 0, 0, 0, 2, 0, 6, 0, 0, 1, 0],
    [1, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 1],
];

var initPack = {};
var removePack = {};

setInterval(function () {
    var pack = {
        player: Player.update(),
    }
    for (var i in SOCKET_CONNECTIONS) {
        var socket = SOCKET_CONNECTIONS[i];
        socket.emit('init', initPack);
        socket.emit('update', pack);
        socket.emit('remove', removePack);
    }
    initPack.player = [];
    removePack.player = [];
}, 50); //20 times per second
