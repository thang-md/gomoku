let player_name, socket, _p5Instance;

$(document).ready(function() {
    connect(window.location.origin);
    setTooltip();
    init();

    $(document).on("keyup", "#inpSearch", function() {
        var value = $(this).val().toLowerCase();
        $("#tbRooms tbody tr").filter(function() {
            $(this).toggle($(this).text().toLowerCase().indexOf(value) > -1);
        });
    });

    $(document).on('click', '#btnLeaveRoom', function() {
        xacNhanRoiPhong();
    });

    $(document).on('click', '#btnTaoPhong', function() {
        taoPhong();
    });
});

function setTooltip() {
    $('[data-toggle="tooltip"]').tooltip();
}

function init() {
    Swal.fire({
        title: "Xin chào!",
        text: "Tên của bạn là?",
        allowEscapeKey: false,
        allowOutsideClick: false,
        input: 'text',
        inputValue: localStorage.getItem('caro-player-name') || '',
        inputPlaceholder: 'Nhập tên...',
        preConfirm: (name) => {
            socket.emit('client_send_new_connect', name, function(isSuccess, errorText) {
                if (isSuccess) {
                    setupEventSocket();

                    player_name = name;
                    localStorage.setItem('caro-player-name', player_name);

                    $('#player_name').append(document.createTextNode(player_name));
                    openGame(false);

                    getOnlineCount();
                    getListRooms();

                    Swal.close();
                } else {
                    Swal.showValidationMessage(errorText);
                }
            });

            return false;
        }
    });
}
