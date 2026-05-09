const port = process.env.PORT || 3000;

const express = require("express");
const http = require("http");

const app = express();
app.use(express.static("public")); // FE đặt index.html

const server = http.createServer(app);
const io = require("socket.io")(server);

server.listen(port);

// Classes
class User {
    constructor(_id, _name) {
        this.id = _id;
        this.name = _name;
        this.isViewer = false;
        this.roomName = null;
    }

    setRoomName(_roomName) {
        this.roomName = _roomName;
    }

    getRoomName() {
        return this.roomName;
    }
}

class ListUsers {
    constructor() {
        this.users = [];
    }

    getUsersCount() {
        return this.users.length;
    }

    addUser(u) {
        this.users.push(u);
    }

    removeUser(u) {
        var index = this.users.indexOf(u);
        if (index >= 0) {
            this.users.splice(index, 1);
            return true;
        }
        return false;
    }

    findUserName(userName) {
        for (var user of this.users) {
            if (user.name == userName) {
                return user;
            }
        }
        return null;
    }

    findUserID(userID) {
        for (var user of this.users) {
            if (user.id == userID) {
                return user;
            }
        }
        return null;
    }
}

function sendOnlineCount(somesoc) {
    if (somesoc) {
        somesoc.emit('server_send_online_count', list_users.getUsersCount());
    } else {
        io.sockets.emit('server_send_online_count', list_users.getUsersCount());
    }
}

// socket io
var list_users = new ListUsers()

io.on("connection", (soc) => {

    soc.on('client_send_new_connect', function(name, onSuccess) {
        if (!name) {
            onSuccess(false, 'Vui lòng nhập tên');
            return;
        }

        var find = list_users.findUserName(name);
        if (find) {
            onSuccess(false, 'Tên đã có người sử dụng');
            return;
        }

        var user = new User(soc.id, name);
        soc.caro_user = user;
        list_users.addUser(user);

        sendOnlineCount();
        onSuccess(true);

        // soc.emit('server_send_io', io);
    })

    soc.on("disconnect", function() {
        if (!soc.caro_user) return;
        list_users.removeUser(soc.caro_user);

        // console.log('--- Xoa ' + soc.caro_user.name + ': ' + list_users.removeUser(soc.caro_user));
        // console.log('xxx ' + soc.caro_user.name + ' đã thoát.');
        sendOnlineCount();
    })

    // online count
    soc.on('client_required_online_count', function(onSuccess) {
        onSuccess(list_users.getUsersCount());
    })

});