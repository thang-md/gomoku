let Rooms = [];
let currentRoom = null;

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
  socket.on("disconnect", reason => {
    addMessage("Mất kết nối", "Server", true, "#f00b");
    if (reason === "io server disconnect") {
      socket.connect();
    }
  });
  socket.on("reconnect", attemptNumber => {
    addMessage("Kết nối lại thành công", "Server", true, "#0f0b");
    Swal.fire({
      icon: "success",
      title: "Đã kết nối lại thành công..",
      text: "Sau " + attemptNumber + " lần cố gắng."
    }).then(result => {
      window.location.reload();
    });
  });
  socket.on("reconnecting", attemptNumber => {
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
  socket.on("server_send_list_rooms", function(data) {
    showListRooms(data);
  });

  socket.on("server_send_online_count", function(online_count) {
    $("#online_count").html(online_count);
  });

  socket.on("server_message_join_room", function(data) {
    let playerName = data.player_name;
    let roomName = data.room_name;

    if (data.id == socket.id) {
      addMessage("Bạn đã vào phòng " + roomName, "Server", true, "#5d59");
    } else {
      addMessage(playerName + " đã vào phòng " + roomName, "Server", true, "#5958");
    }
  });

  socket.on("server_message_leave_room", function(data) {
    let playerName = data.player_name;
    let roomName = data.room_name;

    if (data.id == socket.id) {
      addMessage("Bạn đã rời phòng " + roomName, "Server", true, "#d559");
    } else {
      addMessage(playerName + " đã rời phòng " + roomName, "Server", true, "#9558");
    }
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
        `')">
                <i class="fas fa-key"></i>
            </button>`;
    } else {
      btnVaoPhong =
        `<button class="btn btn-sm btn-success" onclick="vaoPhong('` +
        d.name +
        `')">
                <i class="fas fa-sign-in-alt"></i>
            </button>`;
    }

    if (d.owner && d.owner.name == player_name) {
      btnXoa =
        `<button class="btn btn-sm btn-danger" onclick="xoaPhong('` +
        d.name +
        `')">
                <i class="fas fa-trash-alt"></i>
            </button>`;
    }

    s +=
      `<tr>
            <td><b>` +
      d.name +
      `</b></td>
            <td>` +
      (d.owner ? d.owner.name : "-") +
      `</td>
            <td><i>` +
      (d.preview || "") +
      `</i></td>
            <td><b>` +
      d.users_inroom +
      `</b></td>
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

function taoPhong() {
  Swal.mixin({
    allowEscapeKey: false,
    allowOutsideClick: false,
    showCloseButton: true,
    showCancelButton: true,
    cancelButtonColor: "#d33",
    reverseButtons: true,
    confirmButtonText: "Tiếp →",
    cancelButtonText: "Hủy tạo",
    progressSteps: ["1", "2", "3", "4"]
  })
    .queue([
      {
        input: "password",
        title: "Mật khẩu vào phòng?",
        text: "Để trống nếu không muốn tạo mật khẩu."
      },
      {
        input: "text",
        title: "Thông điệp?",
        text:
          "Thông điệp xem trước ngắn gọn giúp mọi người dễ dàng tìm thấy phòng của bạn."
      },
      {
        title: "Cho phép Khách?",
        text: "Tích vào ô bên dưới để cho phép hoặc hủy",
        input: "checkbox",
        inputValue: 1,
        inputPlaceholder: "Cho phép khách vào xem lượt đang chơi?"
      },
      {
        input: "text",
        title: "Tên phòng?",
        text: "Nhập vào tên phòng muốn tạo.",
        preConfirm: name => {
          if (name == "") {
            return Swal.showValidationMessage(`Tên phòng không được để trống!`);
          } else if (name.indexOf("'") >= 0 || name.indexOf('"') >= 0) {
            return Swal.showValidationMessage(
              `Tên phòng không được chứa kí tự nháy " '`
            );
          }
          for (let r of Rooms) {
            if (r.name == name) {
              return Swal.showValidationMessage(`Tên phòng bị trùng!`);
            }
          }
          return name;
        }
      }
    ])
    .then(result => {
      if (result.value) {
        requestTaoPhong(
          result.value[3],
          result.value[0],
          result.value[1],
          result.value[2]
        );
      }
    });
}

function requestTaoPhong(_name, _pass, _preview, _apceptViewer) {
  socket.emit(
    "client_create_room",
    {
      name: _name,
      pass: _pass,
      preview: _preview,
      apceptViewer: _apceptViewer
    },
    function(isSuccess) {
      if (isSuccess) {
        Swal.fire({
          title: "Tạo thành công!",
          html: "Phòng: " + _name + " <br> Mật khẩu: " + (_pass || "Không"),
          confirmButtonText: "Vào ngay",
          showCancelButton: true,
          cancelButtonText: "Trở về"
        }).then(vaophong => {
          if (vaophong.value) {
            vaoPhong(_name);
          }
        });
      }
    }
  );
}

function checkVaoPhong(name) {
  Swal.fire({
    icon: "warning",
    title: "Yêu cầu mật khẩu",
    text: "Vui lòng nhập mật khẩu",
    input: "password",
    confirmButtonText: "Vào Phòng",
    showCancelButton: true,
    cancelButtonText: "Trở về",
    reverseButtons: true,
    preConfirm: pass => {
      socket.emit("client_required_join_room", name, pass, function(isSuccess) {
        if (isSuccess) {
          vaoPhong(name);
          Swal.close();
        } else {
          Swal.showValidationMessage("Sai mật khẩu");
        }
      });
      return false;
    }
  });
}

function vaoPhong(name) {
  socket.emit("client_join_room", name, function(isSuccess) {
    if (isSuccess) {
      if (_p5Instance) _p5Instance.remove();

      _p5Instance = new p5(caro, "cnv");
      openGame(true);

      for (let r of Rooms) {
        if (r.name == name) {
          currentRoom = r;
        }
      }
    } else {
      Swal.fire({
        icon: "error",
        title: "Lỗi",
        text: "Không thể vào phòng " + name
      });
    }
  });
}

function xacNhanRoiPhong() {
  Swal.fire({
    icon: "warning",
    title: "Rời phòng ?",
    html: "Bạn có chắc muốn rời phòng " + (currentRoom ? currentRoom.name : "này"),
    showCancelButton: true,
    cancelButtonText: "Hủy",
    confirmButtonText: "Rời"
  }).then(result => {
    if (result.value) {
      roiPhong();
    }
  });
}

function roiPhong() {
  socket.emit("client_leave_room", function(isSuccess, errorText) {
    if (isSuccess) {
      if (_p5Instance) _p5Instance.remove();
      currentRoom = null;
      openGame(false);
    } else {
      Swal.fire({
        icon: "error",
        title: errorText
      });
    }
  });
}

function xoaPhong(nameRoom) {
  Swal.fire({
    icon: "warning",
    title: "Bạn có chắc muốn xóa phòng " + nameRoom,
    text: "Mọi người chơi trong phòng này sẽ bị chuyển ra sảnh",
    showCancelButton: true,
    confirmButtonText: "Đồng ý",
    cancelButtonText: "Hủy",
    reverseButtons: true
  }).then(result => {
    if (result.value) {
      socket.emit("client_close_room", nameRoom, function(isSuccess, errorText) {
        if (isSuccess) {
          Swal.fire({
            icon: "success",
            title: "Đang đóng phòng.."
          });
        } else {
          Swal.fire({
            icon: "info",
            text: errorText
          });
        }
      });
    }
  });
}

function openGame(trueFalse) {
  $(".game").css("display", trueFalse ? "block" : "none");
  $(".before-game").css("display", trueFalse ? "none" : "block");
}

function addMessage(mes, from, withTime, color, onclickFunc) {
  Swal.fire({
    toast: true,
    position: "top-end",
    text: mes,
    timer: 3000,
    showConfirmButton: false
  });
}