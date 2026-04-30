const port = process.env.PORT || 3000;

const express = require("express");
const http = require("http");

const app = express();
app.use(express.static("public")); // FE đặt index.html

const server = http.createServer(app);
const io = require("socket.io")(server);

io.on("connection", (socket) => {
});

server.listen(port);