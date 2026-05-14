let Rooms = [];

function connect(server_url) {
    socket = io.connect(server_url, {
        reconnection: true,
        reconnectionDelay: 1000,
        reconnectionAttempts: Infinity,
        forceNew: true
    });

    socket.on("connect", function() {
        console.log("Connected to " + server_url);
    });

    socket.on("disconnect", function(reason) {
        addMessage("Mất kết nối", "Server", true, "#f00b");
        if (reason === "io server disconnect") {
            socket.connect();
        }
    });

    socket.on("reconnect", function(attemptNumber) {
        addMessage("Kết nối lại thành công", "Server", true, "#0f0b");
        Swal.fire({
            icon: "success",
            title: "Đã kết nối lại thành công..",
            text: "Sau " + attemptNumber + " lần cố gắng."
        }).then(result => {
            window.location.reload();
        });
    });

    socket.on("reconnecting", function(attemptNumber) {
        Swal.fire({
            icon: "error",
            title: "Mất kết nối",
            text: "Đang thử kết nối lại... " + attemptNumber,
            allowEscapeKey: false,
            allowOutsideClick: false,
            showConfirmButton: false
        });
    });

    socket.on("server_send_list_rooms", function(data) {
        showListRooms(data);
    });

    socket.on("server_send_online_count", function(online_count) {
        $("#online_count").html(online_count);
    });
}

function setupEventSocket() {
    socket.on("server_send_online_count", function(online_count) {
        $("#online_count").html(online_count);
    });
}

function getOnlineCount() {
    socket.emit("client_required_online_count", function(online_count) {
        $("#online_count").html(
            '<i class="fas fa-globe-americas"></i> ' + online_count
        );
    });
}

function getListRooms() {
    socket.emit("client_required_list_rooms", function(listRooms) {
        showListRooms(listRooms);
    });
}

function showListRooms(listRooms) {
    Rooms = listRooms;

    if (!listRooms || !listRooms.length) {
        $("#tbRooms tbody").html(`
            <tr>
                <td colspan="5">
                    <div class="alert alert-warning mb-0">
                        <strong>Trống!</strong> Hiện chưa có phòng nào.
                    </div>
                </td>
            </tr>
        `);
        return;
    }

    let s = "";
    for (let d of listRooms) {
        let btnVaoPhong = "";
        let btnXoa = "";

        if (d.pass) {
            btnVaoPhong =
                `<button class="btn btn-sm btn-warning" onclick="checkVaoPhong('` +
                d.name +
                `')"><i class="fas fa-key"></i></button>`;
        } else {
            btnVaoPhong =
                `<button class="btn btn-sm btn-success" onclick="vaoPhong('` +
                d.name +
                `')"><i class="fas fa-sign-in-alt"></i></button>`;
        }

        if (d.owner && d.owner.name == player_name) {
            btnXoa =
                `<button class="btn btn-sm btn-danger" onclick="xoaPhong('` +
                d.name +
                `')"><i class="fas fa-trash-alt"></i></button>`;
        }

        s +=
            `<tr>
                <td><b>` + d.name + `</b></td>
                <td>` + (d.owner ? d.owner.name : "-" ) + `</td>
                <td><i>` + (d.preview || "") + `</i></td>
                <td><b>` + d.users_inroom + `</b></td>
                <td>
                    <div class="btn-group">` +
            btnVaoPhong +
            btnXoa +
            `</div>
                </td>
            </tr>`;
    }

    $("#tbRooms tbody").html(s);
}

function checkVaoPhong(name) {
    Swal.fire({
        icon: 'info',
        title: 'Chưa hỗ trợ',
        text: 'Tính năng vào phòng có mật khẩu sẽ hoàn thiện ở W9.'
    });
}

function vaoPhong(name) {
    Swal.fire({
        icon: 'info',
        title: 'Chưa hỗ trợ',
        text: 'Tính năng vào phòng sẽ hoàn thiện ở W9.'
    });
}

function xoaPhong(name) {
    Swal.fire({
        icon: 'info',
        title: 'Chưa hỗ trợ',
        text: 'Tính năng xóa phòng sẽ hoàn thiện ở W9.'
    });
}

function addMessage(mes, from, withTime, color) {
    Swal.fire({
        toast: true,
        position: "top-end",
        title: from ? "[" + from + "]" : "",
        text: mes,
        timer: 2500,
        showConfirmButton: false
    });
}
