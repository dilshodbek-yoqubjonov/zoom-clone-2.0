const express = require("express");
const app = express();
const server = require("http").Server(app);
const { v4: uuidv4 } = require("uuid");
const io = require("socket.io")(server);
const { ExpressPeerServer } = require("peer");
const url = require("url");
const path = require("path");

app.set("view engine", "ejs");
app.use("/public", express.static(path.join(__dirname, "static")));

const peerServer = ExpressPeerServer(server, { debug: true });
app.use("/peerjs", peerServer);

app.get("/", (req, res) => {
    res.sendFile(path.join(__dirname, "static", "index.html"));
});

app.get("/join", (req, res) => {
    if (!req.query.name) {
        return res.status(400).send("Ism kiritilmagan!");
    }
    res.redirect(
        url.format({
            pathname: `/join/${uuidv4()}`,
            query: req.query,
        })
    );
});

app.get("/joinold", (req, res) => {
    if (!req.query.meeting_id || !req.query.name) {
        return res.status(400).send("Meeting ID yoki ism kiritilmagan!");
    }
    res.redirect(
        url.format({
            pathname: req.query.meeting_id,
            query: req.query,
        })
    );
});

app.get("/join/:rooms", (req, res) => {
    res.render("room", { roomid: req.params.rooms, Myname: req.query.name });
});

io.on("connection", (socket) => {
    socket.on("join-room", (roomId, id, myname) => {
        socket.join(roomId);
        socket.to(roomId).emit("user-connected", id, myname);

        socket.on("messagesend", (message) => {
            io.to(roomId).emit("createMessage", message);
        });

        socket.on("tellName", (myname) => {
            socket.to(roomId).emit("AddName", myname);
        });

        socket.on("video-status", (userId, enabled) => {
            socket.to(roomId).emit("video-status", userId, enabled);
        });

        socket.on("audio-status", (userId, enabled) => {
            socket.to(roomId).emit("audio-status", userId, enabled);
        });

        socket.on("disconnect", () => {
            socket.to(roomId).emit("user-disconnected", id);
        });

        socket.on("user-disconnected", (id) => {
            socket.to(roomId).emit("user-disconnected", id);
        });
    });
});

const PORT = process.env.PORT || 3030;
server.listen(PORT, () => {
    console.log(`Server http://localhost:${PORT} da ishga tushdi`);
});