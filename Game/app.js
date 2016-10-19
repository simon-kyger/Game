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
var Player = function (id, name, pclass, realm, ability1, ability2, ability3, ability4, hpMAX) {
    var self = {
        x: 1000,
        y: 500,
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
        status: {
            slept: 0,
            snared: 0,
            stunned: 0
        },
        interupted: false,
        isCasting: false,
        ability1: ability1,
        ability2: ability2,
        ability3: ability3,
        ability4: ability4,
        group: {},
        hp: hpMAX,
        hpMAX: hpMAX,
        isAlive: true,
        isAttacking: false,
        target: '',
        targethp: '',
        gcd: false,
    }
    self.updatePosition = function () {
        if (self.status.slept > 0 || self.isAlive == false) {
            return;
        }
        if (self.target) {
            for (var i in Player.list) {
                if (self.target.id == Player.list[i].id) {
                    self.targethp = Player.list[i].hp;
                }
            }
        }
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
            isAttacking: self.isAttacking,
            ability1: self.ability1,
            ability2: self.ability2,
            ability3: self.ability3,
            ability4: self.ability4,
            hp: self.hp,
            hpMAX: self.hpMAX,
            isAlive: self.isAlive,
            group: self.group,
            target: self.target,
            targethp: self.targethp,
            gcd: self.gcd,
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
            isCasting: self.isCasting,
            isAttacking: self.isAttacking,
            group: null,
            hp: self.hp,
            hpMAX: self.hpMAX,
            isAlive: self.isAlive,
            group: self.group,
            target: self.target,
            targethp: self.targethp,
            frame: self.frame,
        };
    }

    Player.list[id] = self;
    initPack.player.push(self.getInitPack());
    return self;
}
Player.list = {};
Player.onConnect = function (socket, name, pclass, realm) {
    var ability1, ability2, ability3, ability4, hpMAX;
    if (pclass == 'Mage') {
        ability1 = 'sleep';
        ability2 = null;
        ability3 = null;
        ability4 = null;
        hpMAX = 100;
    } else if (pclass == 'Warrior') {
        ability1 = 'slice';
        ability2 = null;
        ability3 = null;
        ability4 = null;
        hpMAX = 250;
    } else if (pclass == 'Priest') {
        ability1 = 'heal';
        ability2 = null;
        ability3 = null;
        ability4 = null;
        hpMAX = 200;
    } else if (pclass == 'Thief') {
        ability1 = null;
        ability2 = null;
        ability3 = null;
        ability4 = null;
        hpMAX = 150;
    } else {
        return; //invalid class selection
    }
    var player = new Player(socket.id, name, pclass, realm, ability1, ability2, ability3, ability4, hpMAX);
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
    
    socket.on('target', function (data) {
        player.target = data.target;
    });
    
    socket.on('ability1', function (data) {
        var type;
        var target;
        
        //verify caster
        type = player.ability1;
        
        //verify target
        for (var i in Player.list) {
            if (Player.list[i].id == data.target.id) {
                target = Player.list[i];
                break;
            }
        }
        
        if (!player || !target)
            return;
        
        //gcd for caster
        if (player.gcd)
            return;
        player.gcd = true;
        setTimeout(function () { player.gcd = false; }, 200);
        
        //state checks of caster
        if (player.isCasting || player.isAttacking || player.isAlive == false) {
            return;
        }
       
        //state checks of target
        if (target.isAlive == false) {
            SOCKET_CONNECTIONS[player.id].emit('addToChat', 'You cannot perform that ability on the dead.', 'orange');
            return;
        }
        
        //manage initialization of variables concerning caster and target
        var xdif = player.x - target.x;
        var ydif = player.y - target.y;
        var distance = Math.sqrt((xdif * xdif) + (ydif * ydif));

        if (type == 'sleep') {
            player.isCasting = true;
            abilitySleep(target, player, distance);
        } else if (type == 'slice') {
            player.isAttacking = true;
            abilitySlice(target, player, distance);
        } else if (type == 'heal') {
            player.isCasting = true;
            abilityHeal(target, player, distance);
        }
    });

    socket.emit('init', {
        selfId: socket.id,
        player: Player.getAllInitPack()
    });
}
function abilityHeal(target, caster, distance) {
    var counter = 0;
    var maxCounter = 2000;
    //preconditional tests against the cast are made here
    if (caster.status.slept) {
        SOCKET_CONNECTIONS[caster.id].emit('addToChat', 'You cannot cast while asleep!', 'orange');
        caster.isCasting = false;
        return;
    }
    if (distance > 700) {
        SOCKET_CONNECTIONS[caster.id].emit('addToChat', 'Your target is out of range', 'orange');
        caster.isCasting = false;
        return;
    }
    if (target.hp < 1) {
        SOCKET_CONNECTIONS[caster.id].emit('addToChat', target.name + ' is dead. You can\'t heal them.', 'orange');
        caster.isCasting = false;
        return;
    }
    if (caster.interuptedby) {
        SOCKET_CONNECTIONS[caster.id].emit('addToChat', caster.interuptedby + ' is attacking you and prevented you from casting!', 'coral');
        caster.isCasting = false;
        return;
    }
    
    //begin the cast
    for (var i in SOCKET_CONNECTIONS) {
        SOCKET_CONNECTIONS[i].emit('addToChat', caster.name + ' begins casting a spell.', '#4c4cff');
    }
    
    caster.frame = 0;

    //during the cast
    var startCast = setInterval(function () {
        if (caster.movUp || caster.movDown || caster.movLeft || caster.movRight || caster.interuptedby || caster.status.slept > 0) {
            SOCKET_CONNECTIONS[caster.id].emit('addToChat', 'Your cast has been interupted!', '#8EE5EE');
            caster.isCasting = false;
            clearInterval(startCast);
        } else if (target.hp < 1) {
            SOCKET_CONNECTIONS[caster.id].emit('addToChat', target.name + ' is now longer a valid target to heal.', '#8EE5EE');
            caster.isCasting = false;
        } 
        else {
            counter += 50;
            caster.frame += .2;
            if (counter >= maxCounter) {
                heal(target);
                caster.isCasting = false;
                clearInterval(startCast);
            }
        }
    }, 50);
    
    //cast has completed, apply effect to target
    function heal(target) {
        if (!SOCKET_CONNECTIONS[caster.id] || !SOCKET_CONNECTIONS[target.id])
            return;
        if (target.hp < 1) {
            SOCKET_CONNECTIONS[caster.id].emit('addToChat', 'Your heal has failed!', 'orchid');
            return;
        }
        for (var i in SOCKET_CONNECTIONS) {
            SOCKET_CONNECTIONS[i].emit('addToChat', target.name + ' has been healed!', 'coral');
        }
        var healamt = Math.floor(Math.random() * 31) + 70; //between 70 and 100;
        //crit chance could be calced here
        target.hp += healamt;
        if (target.hp > target.hpMAX)
            target.hp = target.hpMAX;
        if (target.name == caster.name)
            SOCKET_CONNECTIONS[caster.id].emit('addToChat', 'You heal yourself for ' + healamt + ' health points.', 'orchid');
        else {
            SOCKET_CONNECTIONS[caster.id].emit('addToChat', 'You heal ' + target.name + ' for ' + healamt + ' health points.', 'orchid');
            SOCKET_CONNECTIONS[target.id].emit('addToChat', caster.name + ' has healed you for ' + healamt + ' health points.', 'orchid');
        }
    }
}

function abilitySlice(target, caster, distance) {
    var counter = 0; //attack speed incrementer 
    var maxCounter = 2000;
    if (caster.status.slept > 0) {
        SOCKET_CONNECTIONS[caster.id].emit('addToChat', 'You cannot cast while asleep!', 'orange');
        caster.isAttacking = false;
        return;
    }
    if (distance > TW) {
        SOCKET_CONNECTIONS[caster.id].emit('addToChat', 'Your target is out of range', 'orange');
        caster.isAttacking = false;
        return;
    }
    //begin attack
    SOCKET_CONNECTIONS[caster.id].emit('addToChat', 'You prepare to perform slice on '+ target.name + '.', '#4c4cff');
    caster.frame = 0;
    //during the cast
    var startCast = setInterval(function () {
        if (distance > TW) {
            SOCKET_CONNECTIONS[caster.id].emit('addToChat', 'Your target is out of range!', '#8EE5EE');
            caster.isAttacking = false;
            clearInterval(startCast);
        } else if (caster.status.slept > 0) {
            SOCKET_CONNECTIONS[caster.id].emit('addToChat', 'Your attack was interupted!', '#8EE5EE');
            caster.isAttacking = false;
            clearInterval(startCast);
        } else {
            counter += 100; //attack delay before end of cast
            caster.frame += .4;
            if (counter >= maxCounter) {
                caster.isAttacking = false;
                slice(target, caster);
                clearInterval(startCast);
            }
        }
    }, 50);

    function slice(target, caster) {
        if (!SOCKET_CONNECTIONS[caster.id] || !SOCKET_CONNECTIONS[target.id])
            return;
        var dmg = Math.floor(Math.random() * 31) + 5; //between 5 and 35 
        //crit chance calced here;
        SOCKET_CONNECTIONS[caster.id].emit('addToChat', 'You sliced '+ target.name +' for ' + dmg + ' damage!', 'orange');
        for (var i in SOCKET_CONNECTIONS) {
            SOCKET_CONNECTIONS[i].emit('addToChat', caster.name + ' used [slice] on '+ target.name + '.', 'coral');
        }
        SOCKET_CONNECTIONS[target.id].emit('addToChat', caster.name + ' attacks you for '+ dmg + ' damage!', 'red');
        target.hp -= dmg;
        target.status.slept = 0;
        target.interuptedby = caster.name;
        setTimeout(function () { 
            target.interuptedby = '';
        }, 1500);
        if (target.hp < 1) {
            target.hp = 0;
            target.isAlive = false;
            SOCKET_CONNECTIONS[caster.id].emit('addToChat', 'You have killed ' + target.name + '!');
            SOCKET_CONNECTIONS[target.id].emit('addToChat', 'You have died.');
            var color;
            if (caster.realm == 'Aeolian')
                color = '#ff9999';
            else if (caster.realm == 'Dorian')
                color = '#4c4cff';
            else
                color = 'green';
            for (var i in SOCKET_CONNECTIONS) {
                SOCKET_CONNECTIONS[i].emit('addToChat', target.name + ' was just killed in [undefined] by '+ caster.name +'.', color);
            }
        }
    }
}

function abilitySleep(target, caster, distance) {
    var counter = 0;
    var maxCounter = 2000;
    //preconditional tests against the cast are made here
    if (distance > 700) {
        SOCKET_CONNECTIONS[caster.id].emit('addToChat', 'Your target is out of range', 'orange');
        caster.isCasting = false;
        return;
    }
    if (caster.interuptedby) {
        SOCKET_CONNECTIONS[caster.id].emit('addToChat', caster.interuptedby + ' is attacking you and prevented you from casting!', 'coral');
        caster.isCasting = false;
    }
    
    //begin the cast
    for (var i in SOCKET_CONNECTIONS) {
        SOCKET_CONNECTIONS[i].emit('addToChat', caster.name + ' begins casting a spell.', '#4c4cff');
    }
    caster.frame = 0;
    
    //during the cast
    var startCast = setInterval(function () {
        if (caster.movUp || caster.movDown || caster.movLeft || caster.movRight || caster.interuptedby) {
            SOCKET_CONNECTIONS[caster.id].emit('addToChat', 'Your cast has been interupted!', '#8EE5EE');
            caster.isCasting = false;
            clearInterval(startCast);
        } else {
            counter += 50;
            caster.frame += .2;
            if (counter >= maxCounter) {
                sleep(target, caster);
                caster.isCasting = false;
                clearInterval(startCast);
            }
        }
    }, 50);
    
    //cast has completed, apply effect to target
    function sleep(target, caster) {
        if (!SOCKET_CONNECTIONS[caster.id] || !SOCKET_CONNECTIONS[target.id])
            return;
        //mages are naturally immune, but let the spell cast go through anyway.
        if (target.pclass == 'Mage') {
            SOCKET_CONNECTIONS[caster.id].emit('addToChat', target.name + ' is immune to your spell!');
            SOCKET_CONNECTIONS[target.id].emit('addToChat', caster.name + ' tried to sleep you, but you are immune!');
            return;
        }
        for (var i in SOCKET_CONNECTIONS) {
            SOCKET_CONNECTIONS[i].emit('addToChat', target.name + ' has been slept.', 'orchid');
        }
        target.status.slept += 1;
        target.isCasting = false;
        target.interuptedby = caster.name;
        setTimeout(function () {
            target.interuptedby = '';
        }, 1000);
        setTimeout(function () {
            target.status.slept -= 1;
            if (target.status.slept < 1) {
                for (var i in SOCKET_CONNECTIONS) {
                    SOCKET_CONNECTIONS[i].emit('addToChat', target.name + ' has awoken.', 'orchid');
                }
            }
        }, 10000);
    }
}

Player.getAllInitPack = function () {
    var players = [];
    for (var i in Player.list)
        players.push(Player.list[i].getInitPack());
    return players;
}

Player.update = function () {
    //this should be modified based upon distance for performance reasons.
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
        // more validation needs to be done here
        // as well as signin stuff
        if (data.username && data.password) {
            Player.onConnect(socket, username, pclass, realm);
            socket.emit('loginresponse', { success: true });
        } else
            socket.emit('loginresponse', { success: false });
    });   

    socket.on('disconnect', function () {
        try {
            delete SOCKET_CONNECTIONS[socket.id];
            for (var i in SOCKET_CONNECTIONS) {
                SOCKET_CONNECTIONS[i].emit('remove', socket.id);
                SOCKET_CONNECTIONS[i].emit('addToChat', Player.list[socket.id].name + ' has disconnected.');
            }
            for (var i in Player.list) {
                if (Player.list[i].target.name == Player.list[socket.id].name)
                    Player.list[i].target = '';
            }
            delete Player.list[socket.id];
        } catch (e) {
            console.log(e);
            //the reason for this trycatch is as follows:
            //1: Server is brought online
            //2: A client connects
            //3: Server is taken down for whatever reason
            //4: Server is brought back online
            //5: Client that connected on step 2 attempts to disconnect after the server reboot.
            //6: This exception then gets called, and because socket.id doesn't exist in server memory, everything in here fails.
        }
    });

    socket.on('chatMsg', function (message, color) {
        var playerid = ("" + socket.id);
        for (var i in SOCKET_CONNECTIONS) {
            SOCKET_CONNECTIONS[i].emit('addToChat', message, color);
        }
    });

    socket.on('command', function (casterid, msg) {
        //format command from poststring
        var command = msg.substr(0, 7);
        var target = msg.substr(8);
        if (command === '/invite') {
            var vtarget; //a validator that this entity actually exists
            for (var i in Player.list) {
                if (Player.list[i].name === target) {
                    vtarget = Player.list[i];
                }
            }
            if (vtarget) {
                SOCKET_CONNECTIONS[casterid].emit('addToChat', 'You invited ' + vtarget.name + ' to join your party.', 'green');
                SOCKET_CONNECTIONS[vtarget.id].emit('addToChat', Player.list[casterid].name + ' invited you to join your party.', 'green');
                SOCKET_CONNECTIONS[vtarget.id].emit('groupInvite', Player.list[casterid]);
            } else {
                SOCKET_CONNECTIONS[casterid].emit('addToChat', 'No known player [' + target + ']. Did you forget to capitalize a letter?');
            }
        } else
            SOCKET_CONNECTIONS[casterid].emit('addToChat', 'No known command '+ msg);
    });  
});

var map = [
    [1, 0, 0, 1, 0, 0, 0, 1, 1, 1, 0, 0, 1, 0, 0, 1, 0, 1, 1, 0, 0, 0, 0, 1, 1, 0, 0, 1, 0, 0, 1],
    [0, 0, 1, 0, 0, 0, 1, 1, 0, 0, 1, 1, 1, 1, 0, 0, 1, 1, 0, 0, 0, 0, 0, 1, 1, 0, 0, 1, 0, 0, 1],
    [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 0, 0, 1, 0, 0, 0, 1],
    [1, 0, 0, 1, 0, 0, 0, 0, 0, 1, 0, 0, 0, 1, 1, 1, 0, 0, 1, 0, 0, 1, 0, 0, 0, 1, 1, 1, 0, 0, 1],
    [0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 1, 1, 1, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 1, 1, 1, 0, 0, 0],
    [0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 1, 1, 1, 1, 0, 0, 1],
    [0, 0, 0, 1, 0, 0, 0, 1, 1, 1, 0, 0, 0, 1, 0, 0, 0, 1, 1, 1, 0, 0, 0, 1, 1, 1, 1, 0, 0, 0, 0],
    [0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 1, 1, 1, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0],
    [1, 0, 1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 1, 0, 0, 0, 0, 1, 1, 0, 0, 1],
    [0, 0, 0, 1, 0, 0, 0, 1, 1, 1, 0, 0, 0, 1, 0, 0, 0, 1, 1, 0, 1, 1, 1, 1, 1, 0, 0, 0, 0, 0, 0],
    [0, 0, 1, 0, 0, 0, 1, 1, 0, 0, 1, 1, 1, 1, 0, 0, 1, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0],
    [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 1, 0, 0, 0, 1, 1, 0, 0, 1, 1, 1, 1, 1, 1, 0],
    [0, 0, 0, 1, 0, 0, 0, 0, 0, 1, 0, 0, 0, 1, 1, 1, 0, 0, 1, 0, 0, 0, 0, 1, 1, 1, 0, 0, 0, 1, 1],
    [1, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 1, 1, 1, 0, 0, 1, 0, 0, 1, 1, 1, 1, 1, 0, 0, 1, 0, 0, 1],
    [0, 0, 1, 1, 1, 0, 1, 1, 0, 0, 1, 1, 1, 1, 0, 0, 1, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0],
    [0, 1, 1, 1, 1, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 1, 0, 0, 0, 1, 1, 0, 0, 1, 1, 1, 1, 1, 1, 0],
    [0, 1, 1, 1, 1, 1, 0, 0, 0, 1, 0, 0, 0, 1, 1, 1, 0, 0, 1, 0, 0, 0, 0, 1, 1, 1, 0, 0, 0, 1, 1],
    [1, 1, 1, 1, 1, 1, 0, 0, 1, 0, 0, 0, 1, 1, 1, 0, 0, 1, 0, 0, 1, 1, 1, 1, 1, 0, 0, 1, 0, 0, 1],
    [0, 1, 1, 1, 1, 1, 1, 1, 0, 0, 1, 1, 1, 1, 0, 0, 1, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0],
    [0, 0, 1, 1, 1, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 1, 0, 0, 0, 1, 1, 0, 0, 1, 1, 1, 1, 1, 1, 0],
    [0, 0, 0, 1, 0, 0, 0, 0, 0, 1, 0, 0, 0, 1, 1, 1, 0, 0, 1, 0, 0, 0, 0, 1, 1, 1, 0, 0, 0, 1, 1],
    [1, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 1, 1, 1, 0, 0, 1, 0, 0, 1, 1, 1, 1, 1, 0, 0, 1, 0, 0, 1],
];

var mapOverlay = [
    [0, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 6, 0, 3, 7, 0, 0, 0, 0, 0, 0, 0, 0, 2, 0, 2, 3, 0, 0, 0],
    [0, 0, 0, 0, 1, 0, 0, 0, 0, 7, 6, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 2, 0, 0, 0, 1],
    [0, 0, 1, 7, 0, 0, 0, 0, 1, 0, 0, 1, 0, 0, 0, 1, 0, 0, 6, 0, 0, 0, 0, 0, 7, 0, 2, 0, 0, 0, 0],
    [0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 5, 0, 0, 2, 0, 0, 0, 0, 0, 0, 0, 0, 2, 0, 1, 0, 0, 0, 0],
    [1, 0, 0, 5, 0, 2, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0, 2, 0, 0, 2, 0, 1, 1, 0, 0, 1],
    [0, 0, 0, 0, 0, 0, 4, 1, 4, 2, 0, 0, 3, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 5, 0, 0, 6, 0, 0],
    [0, 0, 3, 3, 0, 0, 0, 3, 0, 0, 0, 0, 0, 0, 0, 6, 1, 2, 2, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
    [2, 1, 0, 1, 0, 4, 0, 0, 2, 0, 2, 3, 0, 0, 1, 1, 0, 0, 2, 0, 0, 4, 0, 0, 5, 0, 0, 0, 0, 0, 2],
    [0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 0, 4, 0, 0, 0, 0, 0, 0, 0, 1, 2],
    [1, 0, 0, 0, 0, 0, 7, 1, 0, 0, 0, 0, 2, 0, 2, 0, 0, 1, 0, 2, 0, 1, 0, 0, 2, 0, 1, 0, 0, 0, 0],
    [1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 3, 0, 1, 1, 0, 2, 0, 0, 0, 0],
    [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 2, 0, 0, 0, 0, 2, 0, 0, 1, 0, 0, 1, 0, 1, 3, 0, 0, 0],
    [1, 0, 0, 0, 0, 0, 0, 1, 0, 0, 7, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 4, 0, 0, 2, 0, 3, 0, 0, 0, 1],
    [1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 4, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 5, 2, 0, 0, 3, 0, 0, 1],
    [0, 0, 0, 0, 0, 0, 0, 2, 0, 0, 0, 0, 0, 4, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0],
    [1, 0, 0, 0, 0, 0, 0, 2, 0, 0, 0, 5, 0, 0, 0, 0, 0, 2, 6, 2, 7, 0, 0, 0, 0, 0, 2, 0, 0, 0, 0],
    [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 4, 3, 0, 0, 0, 1, 0, 0, 0, 4, 1, 0, 0, 0, 2],
    [1, 0, 0, 0, 0, 0, 0, 3, 0, 0, 0, 4, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 2],
    [0, 0, 5, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 4, 0, 6, 0, 0, 3, 0, 0, 1, 0, 0, 2, 0, 0, 0, 6, 0, 3],
    [1, 0, 0, 0, 0, 0, 0, 1, 4, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 2, 0, 1, 0, 0, 0, 0],
    [0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 2, 0, 0, 0, 2, 0, 1, 0, 1, 0, 0, 2, 0, 2, 3, 0, 0, 0],
];

var initPack = {};

setInterval(function () {
    var pack = {
        player: Player.update(),
    }
    for (var i in SOCKET_CONNECTIONS) {
        var socket = SOCKET_CONNECTIONS[i];
        socket.emit('init', initPack);
        socket.emit('update', pack);
    }
    initPack.player = [];
}, 50); //20 times per second
