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

const TW = 128;
const TH = 128;
//player Class
var Player = function (id, name, pclass, realm) {
    var self = {
        x: 128,
        y: 128,
        id: id,
        movUp: false,
        movDown: false,
        movLeft: false,
        movRight: false,
        dir: 'right',
        vel: 16,
        spd: 0,
        frame: 0,
        width: TW,
        height: TH,
        map: map,
        mapOverlay: mapOverlay,
        name: name,
        pclass: pclass,
        realm: realm,
        sframe: 0,
        status: null,
        interupted: false,
        isCasting: false
    }
    self.updatePosition = function () {
        if (self.status == 'slept')
            return;
        if (self.movUp) {
            self.isCasting = false;
            self.spd = self.vel;
            self.y -= self.spd;
        }
        if (self.movDown) {
            self.isCasting = false;
            self.spd = self.vel;
            self.y += self.vel;
        }
        if (self.movLeft) {
            self.isCasting = false;
            self.spd = self.vel;
            self.x -= self.spd;
            self.dir = 'left';
        }
        if (self.movRight) {
            self.isCasting = false;
            self.spd = self.vel;
            self.x += self.spd;
            self.dir = 'right';
        }
        //required for animation stop
        if (!self.movRight && !self.movLeft && !self.movDown && !self.movUp)
            self.spd = 0;
        //map absolute boundaries
        if (self.x < self.width)
            self.x = self.width;
        if (self.y < self.height)
            self.y = self.width;
        if (self.x > (map[0].length-1) * TW)
            self.x = (map[0].length-1) * TW;
        if (self.y > (map.length-1) * TH)
            self.y = (map.length-1) * TH;
    }  
    self.getInitPack = function() {
        return {
            id: self.id,
            x: self.x,
            y: self.y,
            movUp: self.movUp,
            movDown: self.movDown,
            movLeft: self.movLeft,
            movRight: self.movRight,
            dir: self.dir,
            spd: self.spd,
            width: self.width,
            height: self.height,
            frame: self.frame,
            map: self.map,
            mapOverlay: self.mapOverlay,
            pclass: self.pclass,
            name: self.name,
            img: self.img,
            realm: self.realm,
            sframe: self.sframe,
            status: self.status,
            isCasting: self.isCasting,
        };
    }
    self.getUpdatePack = function () {
        return {
            id: self.id,
            x: self.x,
            y: self.y,
            dir: self.dir,
            spd: self.spd,
            status: self.status,
            interupted: self.interupted,
            isCasting: self.isCasting
        };
    }

    Player.list[id] = self;
    initPack.player.push(self.getInitPack());
    return self;
}
Player.list = {};
Player.onConnect = function (socket, name, pclass, realm) {
    var player = new Player(socket.id, name, pclass, realm);
    for (var i in SOCKET_CONNECTIONS) {
        SOCKET_CONNECTIONS[i].emit('addToChat', player.name +' has connected.');
    }
    socket.on('keypress', function (data) {
        if (data.state === 'chatting')
            player.movUp = player.movDown = player.movLeft = player.movRight = false;
        if (data.inputId === 'up') {
            player.movUp = data.state;
        }
        if (data.inputId === 'down') {
            player.movDown = data.state;
        }
        if (data.inputId === 'left') {
            player.movLeft = data.state;
        }
        if (data.inputId === 'right') {
            player.movRight = data.state;
        }
    });
    
    socket.on('ability', function (data) {
        for (var i in Player.list) {
            if (Player.list[i].id == data.self.id) {
                Player.list[i].isCasting = true;
                for (var j in SOCKET_CONNECTIONS) {
                    try {
                        SOCKET_CONNECTIONS[j].emit('addToChat', Player.list[i].name + ' is casting a spell.', '#4c4cff');
                    } catch (e) {
                      //prevents disconnected without a state trying to echo stuff.
                    }
                }
            }
        }
        
        var doInterval = setInterval(function () {
            for (var i in Player.list) {
                if (Player.list[i].id == data.self.id) {
                    var caster = Player.list[i];
                    if (caster.movUp || caster.movDown || caster.movLeft || caster.movRight || caster.interupted) {
                        SOCKET_CONNECTIONS[i].emit('addToChat', 'Your cast has been interupted!', '#8EE5EE');
                        clearTimeout(doCast);
                        clearInterval(doInterval);
                    }
                } 
            }
        }, 50);

        var doCast = setTimeout(function () {
            for (var i in Player.list) {
                if (Player.list[i].id == data.self.id) {
                    var caster = Player.list[i];
                    for (var j in Player.list) {
                        if (Player.list[j].id == data.target.id) {
                            var target = Player.list[j];
                            clearInterval(doInterval);
                            caster.isCasting = false;
                            sleep(target);
                        }
                    }
                }
            }
        }, 2000);

        function sleep(target) {
            for (var k in Player.list) {
                SOCKET_CONNECTIONS[k].emit('addToChat', target.name + ' has been slept.', 'orchid');
            }  
            target.status = 'slept';
            target.isCasting = false;
            setTimeout(function () {
                target.status = '';
            }, 4000);
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
    try {
        for (var i in SOCKET_CONNECTIONS) {
            SOCKET_CONNECTIONS[i].emit('addToChat', Player.list[socket.id].name + ' has disconnected.');
        }
        delete Player.list[socket.id];
        removePack.player.push(socket.id);
    } catch (e) {
        //Basically this block of code gets called if the server is taken down, but a player still keeps his session alive
        //and then if the server is brought back online, and the player disconnects, this exception is triggered.
        //for now we will silently fail because there is nothing we want to broadcast to the server anyway.
    }
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
var USERS = {};
var UNIQUEID = 0;
io.sockets.on('connection', function (socket) {
    socket.id = UNIQUEID;
    UNIQUEID++;
    SOCKET_CONNECTIONS[socket.id] = socket;
    
    socket.on('login', function (data) {
        var pclass = data.pclass.toString().replace(/\r?\n$/, '');
        var realm = data.realm.toString().replace(/\r?\n$/, '');
        var username = data.username.toString().replace(/\r?\n$/, '');
        //if (fdata != 'Warrior' || fdata != 'Mage'){
        //    socket.emit('loginresponse', { success: false });
        //    console.log('fdata is: ' +fdata);
        //    return;
        //}
        if (data.username && data.password) {
            Player.onConnect(socket, username, pclass, realm);
            socket.emit('loginresponse', { success: true });
        } else
            socket.emit('loginresponse', { success: false });
    });   
    //send a message to node console on server and to the clients
    socket.on('disconnect', function () {
        Player.onDisconnect(socket);
        delete SOCKET_CONNECTIONS[socket.id];
    });
    socket.on('chatMsg', function (message, color) {
        var playerid = ("" + socket.id);
        for (var i in SOCKET_CONNECTIONS) {
            SOCKET_CONNECTIONS[i].emit('addToChat', message, color);
        }
    });   
});

var map = [
    [1, 0, 0, 1, 0, 0, 0, 1, 1, 1, 0, 0, 1, 0, 0, 1, 0, 1, 1],
    [0, 0, 1, 0, 0, 0, 1, 1, 0, 0, 1, 1, 1, 1, 0, 0, 1, 1, 0],
    [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 1, 0, 0],
    [1, 0, 0, 1, 0, 0, 0, 0, 0, 1, 0, 0, 0, 1, 1, 1, 0, 0, 1],
    [0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 1, 1, 1, 0, 0, 1, 0],
    [0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0],
    [0, 0, 0, 1, 0, 0, 0, 1, 1, 1, 0, 0, 0, 1, 0, 0, 0, 1, 1],
    [0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 1, 1, 1, 0, 0, 1, 0],
    [1, 0, 1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0],
    [0, 0, 0, 1, 0, 0, 0, 1, 1, 1, 0, 0, 0, 1, 0, 0, 0, 1, 1],
    [0, 0, 1, 0, 0, 0, 1, 1, 0, 0, 1, 1, 1, 1, 0, 0, 1, 1, 0],
    [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 1, 0, 0],
    [0, 0, 0, 1, 0, 0, 0, 0, 0, 1, 0, 0, 0, 1, 1, 1, 0, 0, 1],
    [1, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 1, 1, 1, 0, 0, 1, 0],
];

var mapOverlay = [
    [0, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 6, 0, 3, 7, 0, 0, 0],
    [0, 0, 0, 0, 1, 0, 0, 0, 0, 7, 6, 0, 0, 0, 0, 0, 1, 0, 0],
    [0, 0, 1, 7, 0, 0, 0, 0, 1, 0, 0, 1, 0, 0, 0, 1, 0, 0, 6],
    [0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 5, 0, 0, 2, 0, 0, 0],
    [1, 0, 0, 5, 0, 2, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 0],
    [0, 0, 3, 0, 0, 0, 4, 1, 4, 2, 0, 0, 3, 0, 0, 0, 0, 0, 0],
    [0, 0, 3, 3, 0, 0, 0, 3, 0, 0, 0, 0, 0, 0, 0, 6, 1, 2, 2],
    [2, 1, 0, 1, 0, 4, 0, 0, 2, 0, 2, 3, 0, 0, 1, 1, 0, 0, 2],
    [0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
    [1, 0, 0, 0, 0, 0, 7, 1, 0, 0, 0, 0, 2, 0, 2, 0, 0, 1, 0],
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
