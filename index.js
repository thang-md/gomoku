// =================== CONFIG ===================
require('dotenv').config();

var port = process.env.PORT || 3000;
var MONGODB_URI = process.env.MONGODB_URI;
var SESSION_SECRET = process.env.SESSION_SECRET || 'gomoku_secret_key_change_in_production';

if (!MONGODB_URI) {
  throw new Error('MONGODB_URI is not configured. Set it in .env or environment variables.');
}

var express = require('express');
var app = express();
var session = require('express-session');
var MongoStore = require('connect-mongo');
var bcrypt = require('bcrypt');
var mongoose = require('mongoose');

// =================== MONGODB ===================
mongoose.connect(MONGODB_URI)
  .then(() => console.log('✅ MongoDB connected'))
  .catch(err => console.error('❌ MongoDB error:', err));

var UserSchema = new mongoose.Schema({
  username: { type: String, required: true, unique: true, trim: true },
  password: { type: String, required: true },
  createdAt: { type: Date, default: Date.now }
});
var UserModel = mongoose.model('User', UserSchema);

// =================== MIDDLEWARE ===================
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(session({
  secret: SESSION_SECRET,
  resave: false,
  saveUninitialized: false,
  store: MongoStore.create({ mongoUrl: MONGODB_URI }),
  cookie: { maxAge: 1000 * 60 * 60 * 24 * 7 } // 7 ngày
}));

// Phục vụ file tĩnh (public) — chỉ sau khi có session
app.use(express.static('public'));

// =================== AUTH ROUTES ===================

// Middleware bảo vệ route
function requireAuth(req, res, next) {
  if (req.session && req.session.user) return next();
  res.redirect('/login.html');
}

// API: Đăng ký
app.post('/api/register', async (req, res) => {
  try {
    const { username, password } = req.body;
    if (!username || !password)
      return res.json({ success: false, message: 'Vui lòng nhập đầy đủ thông tin.' });
    if (username.length < 3)
      return res.json({ success: false, message: 'Tên đăng nhập phải có ít nhất 3 ký tự.' });
    if (password.length < 6)
      return res.json({ success: false, message: 'Mật khẩu phải có ít nhất 6 ký tự.' });

    const exists = await UserModel.findOne({ username });
    if (exists)
      return res.json({ success: false, message: 'Tên đăng nhập đã tồn tại.' });

    const hash = await bcrypt.hash(password, 10);
    const user = new UserModel({ username, password: hash });
    await user.save();

    req.session.user = { id: user._id.toString(), username: user.username };
    res.json({ success: true, username: user.username });
  } catch (err) {
    console.error(err);
    res.json({ success: false, message: 'Lỗi server.' });
  }
});

// API: Đăng nhập
app.post('/api/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    if (!username || !password)
      return res.json({ success: false, message: 'Vui lòng nhập đầy đủ thông tin.' });

    const user = await UserModel.findOne({ username });
    if (!user)
      return res.json({ success: false, message: 'Tên đăng nhập không tồn tại.' });

    const match = await bcrypt.compare(password, user.password);
    if (!match)
      return res.json({ success: false, message: 'Mật khẩu không đúng.' });

    req.session.user = { id: user._id.toString(), username: user.username };
    res.json({ success: true, username: user.username });
  } catch (err) {
    console.error(err);
    res.json({ success: false, message: 'Lỗi server.' });
  }
});

// API: Kiểm tra session (dùng khi reload trang)
app.get('/api/me', (req, res) => {
  if (req.session && req.session.user) {
    res.json({ loggedIn: true, username: req.session.user.username });
  } else {
    res.json({ loggedIn: false });
  }
});

// API: Đăng xuất
app.post('/api/logout', (req, res) => {
  req.session.destroy(() => {
    res.json({ success: true });
  });
});

// =================== SERVER ===================
var server = require('http').Server(app);
var io = require('socket.io')(server);
server.listen(port, () => console.log(`🚀 Server chạy tại http://localhost:${port}`));
// ========================== Classes =====================
function arrayRemove(arr, value) {

    return arr.filter(function(ele) {
        return ele != value;
    });

}

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

class Room {
    constructor(_owner, _name, _pass, _preview, _apceptViewer, _maxPlayers) {
        this.owner = _owner;
        this.name = _name;
        this.pass = _pass;
        this.preview = _preview;
        this.apceptViewer = _apceptViewer;
        this.maxPlayers = _maxPlayers || 2;
        this.maxUsers = this.apceptViewer ? 20 : this.maxPlayers;

        this.users = [];
        this.chat = [];
        this.history = [];
    }

    getUsersCount() {
        return this.users.length;
    }

    addUser(u) {
        if (this.users.length < this.maxUsers) {
            u.setRoomName(this.name);
            u.isViewer = u != this.owner;
            u.isPendingRole = u != this.owner;

            this.users.push(u);
            return true;
        }
        return false;
    }

    removeUser(u) {
        var index = this.users.indexOf(u);
        if (index >= 0) {
            this.users[index].setRoomName(null);
            this.users.splice(index, 1);
            return true;
        }
        return false;
    }

    removeAllUsers() {
        this.users = [];
    }

    addHistory(h) {
        this.history.push(h);
    }

    getHistory() {
        return this.history;
    }

    undo() {
        this.history.pop();
    }

    clearHistory() {
        this.history = [];
    }

    isFull() {
        return this.users.length >= this.maxUsers;
    }

    getPlayers() {
        return this.users.filter(function(user) {
            return !user.isViewer;
        });
    }

    getOpponent() {
        for (var user of this.users) {
            if (user != this.owner && !user.isViewer) {
                return user;
            }
        }
        return null;
    }

    canAddUser() {
        return this.users.length < this.maxUsers;
    }

    canSetOpponent(user) {
        return user == this.owner || !this.getOpponent();
    }

    setRole(user, role) {
        if (role == 'opponent') {
            user.isViewer = false;
            user.isPendingRole = false;
            return true;
        }

        if (role == 'viewer' && this.apceptViewer) {
            user.isViewer = true;
            user.isPendingRole = false;
            return true;
        }

        return false;
    }

    transferOwnerIfNeeded() {
        if (this.users.indexOf(this.owner) >= 0) return null;

        var newOwner = this.getOpponent() || this.users[0] || null;
        if (!newOwner) return null;

        this.owner = newOwner;
        newOwner.isViewer = false;
        newOwner.isPendingRole = false;
        return newOwner;
    }
}

class ListRooms {
    constructor() {
        this.rooms = [];
    }

    getRoomsCount() {
        return this.rooms.length;
    }

    addRoom(r) {
        this.rooms.push(r);
    }

    removeRoom(r) {
        var index = this.rooms.indexOf(r);
        if (index >= 0) {
            this.rooms.splice(index, 1);
            return true;
        }
        return false;
    }

    findRoom(roomName) {
        for (var room of this.rooms) {
            if (room.name == roomName) {
                return room;
            }
        }
        return null;
    }
}

function sendListRooms(somesoc) {
    // send list rooms
    var data = [];
    for (var r of list_rooms.rooms) {
        data.push({
            "owner": r.owner.name,
            "name": r.name,
            "pass": r.pass,
            "preview": r.preview,
            "apceptViewer": r.apceptViewer,
            "users_inroom": r.users.length,
            "players_inroom": r.getPlayers().length,
            "max_players": r.maxPlayers,
            "max_users": r.maxUsers
        })
    }
    if (somesoc) {
        somesoc.emit('server_send_list_rooms', data);
    } else {
        io.sockets.emit('server_send_list_rooms', data);
    }
}

function sendRandomFirstTurn(room) {
    if (!room) return;

    var players = room.getPlayers();
    
    // Nếu không đủ 2 người chơi, gửi 'waiting' để họ chờ đối thủ
    if (players.length < room.maxPlayers) {
        for (var player of players) {
            io.to(player.id).emit('server_send_turn', 'waiting');
        }
        return;
    }

    var firstPlayerIndex = Math.floor(Math.random() * players.length);

    for (var i = 0; i < players.length; i++) {
        io.to(players[i].id).emit('server_send_turn', i == firstPlayerIndex ? 'on' : 'off');
    }

    for (var viewer of room.users) {
        if (viewer.isViewer) {
            io.to(viewer.id).emit('server_send_turn', 'viewer');
        }
    }
}

function sendRoomRole(user, room) {
    if (!user || !room) return;

    var role = 'viewer';
    if (user == room.owner) {
        role = 'owner';
    } else if (!user.isViewer) {
        role = 'opponent';
    }

    io.to(user.id).emit('server_send_room_role', {
        "role": role,
        "isOwner": user == room.owner,
        "isViewer": user.isViewer,
        "room_name": room.name,
        "owner": room.owner.name
    });
}

function sendRolesToRoom(room) {
    if (!room) return;

    for (var user of room.users) {
        sendRoomRole(user, room);
    }
}

function requestOwnerAssignRole(room, user) {
    if (!room || !user || user == room.owner) return;

    io.to(room.owner.id).emit('server_request_assign_role', {
        "id": user.id,
        "name": user.name,
        "room_name": room.name,
        "canBeOpponent": !room.getOpponent(),
        "canBeViewer": room.apceptViewer
    });
}

function sendOnlineCount(somesoc) {
    if (somesoc) {
        somesoc.emit('server_send_online_count', list_users.getUsersCount());
    } else {
        io.sockets.emit('server_send_online_count', list_users.getUsersCount());
    }
}

// ======================== Socket io ==========================
var list_rooms = new ListRooms();
var list_users = new ListUsers()

io.on("connection", function(soc) {

    // init
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

        var nameRoom = soc.caro_user.getRoomName();
        if (!nameRoom) {
            io.sockets.emit('server_message_disconnect', soc.caro_user.name);

        } else {
            var room = list_rooms.findRoom(nameRoom);
            if (room) {
                var wasOwner = room.owner == soc.caro_user;
                room.removeUser(soc.caro_user);
                soc.leave(nameRoom);

                if (wasOwner) {
                    var newOwner = room.transferOwnerIfNeeded();
                    if (newOwner) {
                        io.sockets.to(nameRoom).emit('server_owner_changed', {
                            "owner": newOwner.name,
                            "room_name": nameRoom
                        });
                        sendRolesToRoom(room);
                    }
                }

                // Kiểm tra số người chơi còn lại
                var remainingPlayers = room.getPlayers();
                if (remainingPlayers.length == 0) {
                    // Không còn người chơi nào - xóa phòng và kick viewers
                    io.sockets.to(nameRoom).emit('server_send_leave_room', 'Trò chơi kết thúc. Phòng được đóng lại. Bạn được đưa ra sảnh!');
                    list_rooms.removeRoom(room);
                    sendListRooms();
                } else if (remainingPlayers.length == 1) {
                    // Còn 1 người chơi - thông báo đối thủ rời và reset ván chơi
                    room.history = []; // Clear game history
                    io.sockets.to(nameRoom).emit('server_message_opponent_left', 'Đối thủ đã rời phòng. Ván chơi được dọn dẹp. Chờ đối thủ mới!');
                    sendRandomFirstTurn(room);
                } else {
                    io.sockets.to(nameRoom).emit('server_message_disconnect', soc.caro_user.name);
                    sendListRooms();
                }
            }
        }
        list_users.removeUser(soc.caro_user);

        // console.log('--- Xoa ' + soc.caro_user.name + ': ' + list_users.removeUser(soc.caro_user));
        // console.log('xxx ' + soc.caro_user.name + ' đã thoát.');
        sendOnlineCount();
        sendListRooms();
    })

    // rooms
    soc.on('client_create_room', function(data, onSuccess) {
        var room = new Room(soc.caro_user, data.name, data.pass, data.preview, data.apceptViewer);
        list_rooms.addRoom(room);

        // console.log(soc.caro_user.name + " Created room " + data.name);

        sendListRooms();
        onSuccess(true);
    })

    soc.on('client_join_room', function(nameRoom, onSuccess) {
        var room = list_rooms.findRoom(nameRoom);
        if (!room) {
            onSuccess(false, 'Không tìm thấy phòng');
            return;
        }

        if (!room.canAddUser()) {
            onSuccess(false, 'Phòng đã đầy. Hãy thử phòng khác');
            return;
        }

        // Nếu phòng không cho phép khách mời, chỉ cho chủ phòng cũ hoặc đối thủ
        if (!room.apceptViewer && room.getOpponent() && soc.caro_user != room.owner) {
            onSuccess(false, 'Phòng này không cho phép khách mời. Phòng đã có đối thủ rồi');
            return;
        }

        room.addUser(soc.caro_user);

        soc.join(nameRoom);
        soc.caro_user.setRoomName(nameRoom);

        io.sockets.to(nameRoom).emit('server_message_join_room', {
            "id": soc.caro_user.id,
            "player_name": soc.caro_user.name,
            "room_name": nameRoom
        })

        // console.log(soc.caro_user.name + " Joined room " + nameRoom);
        sendListRooms();
        onSuccess(true);
        sendRoomRole(soc.caro_user, room);

        // Nếu là người mới vào (không phải chủ phòng), yêu cầu chủ phòng gán vai trò
        if (soc.caro_user != room.owner) {
            requestOwnerAssignRole(room, soc.caro_user);
        }
    })

    soc.on('client_leave_room', function(onSuccess) {
        var roomName = soc.caro_user.getRoomName();
        if (!roomName) {
            onSuccess(false, 'Không tìm thấy tên phòng');
            return;
        }

        var room = list_rooms.findRoom(roomName);
        if (!room) {
            onSuccess(false, 'Không tìm thấy phòng');
            return;
        }

        var wasOwner = room.owner == soc.caro_user;
        room.removeUser(soc.caro_user);
        soc.leave(roomName);

        if (wasOwner) {
            var newOwner = room.transferOwnerIfNeeded();
            if (newOwner) {
                io.sockets.to(roomName).emit('server_owner_changed', {
                    "owner": newOwner.name,
                    "room_name": roomName
                });
                sendRolesToRoom(room);
            }
        }

        // Kiểm tra số người chơi còn lại
        var remainingPlayers = room.getPlayers();
        if (remainingPlayers.length == 0) {
            // Không còn người chơi nào - xóa phòng và kick viewers
            io.sockets.to(roomName).emit('server_send_leave_room', 'Trò chơi kết thúc. Phòng được đóng lại. Bạn được đưa ra sảnh!');
            list_rooms.removeRoom(room);
            sendListRooms();
            onSuccess(true);
            return;
        } else if (remainingPlayers.length == 1) {
            // Còn 1 người chơi - thông báo đối thủ rời và reset ván chơi
            room.history = []; // Clear game history
            io.sockets.to(roomName).emit('server_message_opponent_left', 'Đối thủ đã rời phòng. Ván chơi được dọn dẹp. Chờ đối thủ mới!');
            sendRandomFirstTurn(room);
        } else {
            // Bình thường (nếu có > 2 người chơi - không nên xảy ra)
            io.sockets.emit('server_message_leave_room', {
                "id": soc.caro_user.id,
                "player_name": soc.caro_user.name,
                "room_name": roomName
            });
        }

        // thực hiện xóa phòng nếu không còn ai
        if (room.getUsersCount() == 0) {

            list_rooms.removeRoom(room);
        }

        // console.log(soc.caro_user.name + " Leaved room " + roomName);
        sendListRooms();
        onSuccess(true);
    })

    soc.on('client_required_join_room', function(nameRoom, inpPass, onSuccess) {
        var room = list_rooms.findRoom(nameRoom);
        if (!room) {
            onSuccess(false);
            return;
        }

        if (!room.canAddUser()) {
            onSuccess(false, 'Phòng đã đầy');
            return;
        }

        onSuccess(inpPass == room.pass);
    })

    soc.on('client_assign_room_role', function(data, onSuccess) {
        var room = list_rooms.findRoom(data.roomName);
        if (!room) {
            if (onSuccess) onSuccess(false, 'Không tìm thấy phòng');
            return;
        }

        if (room.owner != soc.caro_user) {
            if (onSuccess) onSuccess(false, 'Bạn không phải chủ phòng');
            return;
        }

        var targetUser = list_users.findUserID(data.userId);
        if (!targetUser || targetUser.getRoomName() != room.name || room.users.indexOf(targetUser) < 0) {
            if (onSuccess) onSuccess(false, 'Người chơi không còn trong phòng');
            return;
        }

        if (data.role == 'opponent' && !room.canSetOpponent(targetUser)) {
            if (onSuccess) onSuccess(false, 'Phòng đã có đối thủ');
            return;
        }

        if (!room.setRole(targetUser, data.role)) {
            if (onSuccess) onSuccess(false, 'Không thể gán vai trò này');
            return;
        }

        sendRolesToRoom(room);
        sendListRooms();
        io.sockets.to(room.name).emit('server_room_role_changed', {
            "id": targetUser.id,
            "name": targetUser.name,
            "role": data.role,
            "room_name": room.name
        });

        if (data.role == 'opponent' && room.getPlayers().length == room.maxPlayers) {
            room.clearHistory();
            io.sockets.to(room.name).emit('server_send_reset');
            sendRandomFirstTurn(room);
        }

        if (onSuccess) onSuccess(true);
    })

    soc.on('client_close_room', function(nameRoom) {
        var room = list_rooms.findRoom(nameRoom);
        if (!room) {
            onSuccess(false, 'Không tìm thấy phòng ' + nameRoom);
            return;
        }

        if(room.owner != soc.caro_user) {
            onSuccess(false, 'Bạn không phải chủ phòng nên không thể đóng phòng ' + nameRoom);
            return;
        }

        io.sockets.to(room.name).emit('server_send_leave_room', 'Phòng đã bị đóng, bạn được đưa ra sảnh!');

        // sau khi tất cả được đưa ra ngoài sảnh => số người trong phòng = 0 => tự động xóa
        // xóa phòng thật sự sẽ ở 'client_leave_room'
    });

    soc.on('client_required_list_rooms', function(onSuccess) {
        var data = [];
        for (var r of list_rooms.rooms) {
            data.push({
                "owner": r.owner.name,
                "name": r.name,
                "pass": r.pass,
                "preview": r.preview,
                "apceptViewer": r.apceptViewer,
                "users_inroom": r.users.length,
                "players_inroom": r.getPlayers().length,
                "max_players": r.maxPlayers,
                "max_users": r.maxUsers
            })
        }
        onSuccess(data);
    })

    // online count
    soc.on('client_required_online_count', function(onSuccess) {
        onSuccess(list_users.getUsersCount());
    })

    // messages
    soc.on('client_send_message', function(data) {
        var roomName = soc.caro_user.getRoomName();
        if (roomName) {
            if (soc.caro_user.isViewer) return;

            io.sockets.to(roomName).emit('server_send_message', {
                'id': soc.id,
                "from": data.from,
                'mes': data.mes
            });
        } else {
            io.sockets.emit('server_send_message', {
                'id': soc.id,
                "from": data.from,
                'mes': data.mes
            });
        }
    })

    // ============================ Caro Area =============================
    soc.on('client_required_history_game', function(onSuccess) {
        var roomName = soc.caro_user.getRoomName();
        if (!roomName) {
            onSuccess(false);
            return;
        }

        var room = list_rooms.findRoom(roomName);
        if (!room) {
            onSuccess(false);
            return;
        }

        onSuccess(room.getHistory());
    })

    soc.on("client_clicked", function(data) {
        var roomName = soc.caro_user.getRoomName();
        if (!roomName) return;

        var room = list_rooms.findRoom(roomName);
        if (!room) return;
        if (soc.caro_user.isViewer) return;
        if (room.getPlayers().length < room.maxPlayers) return;

        room.addHistory(data);
        // Gửi nước đi cho tất cả (cả players và viewers)
        soc.broadcast.to(roomName).emit('server_send_clicked', data);
        // Gửi lượt cho tất cả (cả players và viewers)
        for (var user of room.users) {
            if (!user.isViewer && user.id != soc.id) {
                io.to(user.id).emit('server_send_turn', 'on');
            }
        }
        soc.emit('server_send_turn', 'off');
        // Viewers luôn nhận trạng thái "viewer" để không bao giờ có lượt
        for (var viewer of room.users) {
            if (viewer.isViewer) {
                io.to(viewer.id).emit('server_send_turn', 'viewer');
            }
        }
    })

    soc.on('client_send_want_reset', function(name) {
        var roomName = soc.caro_user.getRoomName();
        if (!roomName) return;
        if (soc.caro_user.isViewer) return;

        var room = list_rooms.findRoom(roomName);
        if (!room) return;

        for (var user of room.getPlayers()) {
            if (user.id != soc.id) {
                io.to(user.id).emit('server_send_want_reset', name);
            }
        }
    })

    soc.on('client_apcept_reset', function(data) {
        var roomName = soc.caro_user.getRoomName();
        if (!roomName) return;

        var room = list_rooms.findRoom(roomName);
        if (!room) return;
        if (soc.caro_user.isViewer) return;

        if (data.apcepted) {
            // Gửi server_send_reset chỉ cho các players, không phải viewers
            for (var player of room.getPlayers()) {
                io.to(player.id).emit('server_send_reset', { auto: false });
            }
            // Thông báo cho viewers biết ván mới được tạo
            for (var viewer of room.users) {
                if (viewer.isViewer) {
                    io.to(viewer.id).emit('server_send_reset', { auto: false });
                }
            }
            room.history = [];
            sendRandomFirstTurn(room);
        } else {
            soc.broadcast.to(roomName).emit('server_send_deny_reset', data.from);
        }
    })

    soc.on('client_clear_finished_game', function() {
        var roomName = soc.caro_user.getRoomName();
        if (!roomName) return;

        var room = list_rooms.findRoom(roomName);
        if (!room) return;

        room.clearHistory();
        // Gửi reset signal cho tất cả (auto = true vì là tự động reset)
        io.sockets.to(roomName).emit('server_send_reset', { auto: true });
        // Random lượt chơi mới cho ván tiếp theo
        sendRandomFirstTurn(room);
    })

    soc.on('client_send_want_undo', function(data) {
        var roomName = soc.caro_user.getRoomName();
        if (!roomName) return;
        if (soc.caro_user.isViewer) return;

        var room = list_rooms.findRoom(roomName);
        if (!room) return;

        for (var user of room.getPlayers()) {
            if (user.id != soc.id) {
                io.to(user.id).emit('server_send_want_undo', data);
            }
        }
    })

    soc.on('client_apcept_undo', function(data) {
        var roomName = soc.caro_user.getRoomName();
        if (!roomName) return;

        var room = list_rooms.findRoom(roomName);
        if (!room) return;
        if (soc.caro_user.isViewer) return;

        if (data.apcepted) {
            io.sockets.to(roomName).emit('server_send_undo', data);
            for (var i = 0; i < data.soBuoc; i++) {
                room.history.pop();
            }

        } else {
            soc.broadcast.emit('server_send_deny_undo', data.from);
        }
    })

    soc.on('client_send_win', function(name) {
        var roomName = soc.caro_user.getRoomName();
        if (!roomName) return;
        if (soc.caro_user.isViewer) return;

        var room = list_rooms.findRoom(roomName);
        if (!room) return;

        // Thông báo ai thắng cho tất cả
        io.sockets.to(roomName).emit('server_send_win', {
            "id": soc.id,
            "name": name
        });

        // Reset game và random lượt chơi mới cho ván tiếp theo (auto = true vì là tự động reset)
        room.clearHistory();
        // Gửi reset signal cho tất cả (cả players và viewers)
        io.sockets.to(roomName).emit('server_send_reset', { auto: true });
        sendRandomFirstTurn(room);
    })

    // ============================== END Caro =============================

})
