const socket = io("/");
const main__chat__window = document.getElementById("main__chat_window");
const videoGrids = document.getElementById("video-grids");
const myVideo = document.createElement("video");
const chat = document.getElementById("chat");
let OtherUsername = "";
chat.hidden = true;
myVideo.muted = true;

var peer = new Peer(undefined, {
    path: "/peerjs",
    host: "/",
    port: "3030",
});

let myVideoStream;
const peers = {};
var getUserMedia =
    navigator.getUserMedia ||
    navigator.webkitGetUserMedia ||
    navigator.mozGetUserMedia;

const requestMediaAccess = async () => {
    try {
        const stream = await navigator.mediaDevices.getUserMedia({
            video: true,
            audio: true,
        });
        return stream;
    } catch (err) {
        console.error("Media ruxsatini olishda xato:", err);
        alert("Kamera yoki mikrofon ruxsatini bering!");
        return null;
    }
};

const sendmessage = (text) => {
    if (event.key === "Enter" && text.value !== "") {
        socket.emit("messagesend", myname + " : " + text.value);
        text.value = "";
        main__chat_window.scrollTop = main__chat_window.scrollHeight;
    }
};

const clearVideos = () => {
    while (videoGrids.firstChild) {
        videoGrids.removeChild(videoGrids.firstChild);
    }
};

const initMedia = async () => {
    const stream = await requestMediaAccess();
    if (!stream) return;

    myVideoStream = stream;
    addVideoStream(myVideo, stream, myname);

    socket.on("user-connected", (id, username) => {
        connectToNewUser(id, stream, username);
        socket.emit("tellName", myname);
    });

    socket.on("user-disconnected", (id) => {
        if (peers[id]) {
            peers[id].close();
            delete peers[id];
        }
    });

    socket.on("video-status", (id, enabled) => {
        console.log(`Video status qabul qilindi: User ${id}, enabled: ${enabled}`);
        const videoEl = document.querySelector(`video[data-peer-id="${id}"]`);
        if (videoEl) {
            if (enabled) {
                videoEl.classList.remove("hidden");
                // Streamni qayta yuklash
                videoEl.srcObject = videoEl.srcObject;
                videoEl.play().catch((err) => {
                    console.error("Video play xatosi:", err);
                });
            } else {
                videoEl.classList.add("hidden");
            }
        }
    });

    socket.on("audio-status", (id, enabled) => {
        console.log(`User ${id} audio status: ${enabled}`);
    });
};

peer.on("call", (call) => {
    getUserMedia(
        { video: true, audio: true },
        (stream) => {
            call.answer(stream);
            const video = document.createElement("video");
            video.setAttribute("data-peer-id", call.peer);
            call.on("stream", (remoteStream) => {
                addVideoStream(video, remoteStream, OtherUsername);
            });
        },
        (err) => {
            console.error("Failed to get local stream", err);
        }
    );
});

peer.on("open", (id) => {
    socket.emit("join-room", roomId, id, myname);
});

socket.on("createMessage", (message) => {
    const ul = document.getElementById("messageadd");
    const li = document.createElement("li");
    li.className = "message";
    li.appendChild(document.createTextNode(message));
    ul.appendChild(li);
});

socket.on("AddName", (username) => {
    OtherUsername = username;
});

const RemoveUnusedDivs = () => {
    const alldivs = videoGrids.getElementsByTagName("div");
    for (let i = alldivs.length - 1; i >= 0; i--) {
        if (alldivs[i].getElementsByTagName("video").length === 0) {
            alldivs[i].remove();
        }
    }
};

const connectToNewUser = (userId, streams, myname) => {
    const call = peer.call(userId, streams);
    const video = document.createElement("video");
    video.setAttribute("data-peer-id", userId);
    call.on("stream", (userVideoStream) => {
        addVideoStream(video, userVideoStream, myname);
    });
    call.on("close", () => {
        video.remove();
        RemoveUnusedDivs();
    });
    peers[userId] = call;
};

const cancel = () => {
    $("#getCodeModal").modal("hide");
};

const copy = async () => {
    const roomid = document.getElementById("roomid").innerText;
    await navigator.clipboard.writeText("http://localhost:3030/join/" + roomid);
    alert("Havola nusxalandi!");
};

const invitebox = () => {
    $("#getCodeModal").modal("show");
};

const muteUnmute = () => {
    if (!myVideoStream) return;
    const enabled = myVideoStream.getAudioTracks()[0].enabled;
    myVideoStream.getAudioTracks()[0].enabled = !enabled;
    document.getElementById("mic").style.color = enabled ? "red" : "white";
    socket.emit("audio-status", peer.id, !enabled);
};

const VideomuteUnmute = () => {
    if (!myVideoStream) {
        console.error("myVideoStream mavjud emas!");
        return;
    }

    const videoTrack = myVideoStream.getVideoTracks()[0];
    if (!videoTrack) {
        console.error("Video track topilmadi!");
        return;
    }

    // Video track holatini o‘zgartirish
    const isEnabled = !videoTrack.enabled;
    videoTrack.enabled = isEnabled;

    console.log(`Video holati: ${isEnabled ? "Yoqildi" : "O‘chirildi"}`);

    // O‘z videomizni ko‘rsatish/yashirish
    if (isEnabled) {
        myVideo.classList.remove("hidden");
        // Streamni qayta yuklash uchun
        myVideo.srcObject = myVideoStream;
        myVideo.play().catch((err) => {
            console.error("Video play xatosi:", err);
        });
    } else {
        myVideo.classList.add("hidden");
    }

    // Tugma rangini o‘zgartirish
    document.getElementById("video").style.color = isEnabled ? "white" : "red";

    // Boshqa sessiyalarga xabar yuborish
    socket.emit("video-status", peer.id, isEnabled);
};

const showchat = () => {
    chat.hidden = !chat.hidden;
    if (!chat.hidden) {
        chat.classList.add("active");
    }
};

const addVideoStream = (videoEl, stream, name) => {
    videoEl.srcObject = stream;
    videoEl.addEventListener("loadedmetadata", () => {
        videoEl.play().catch((err) => console.error("Video play xatosi:", err));
    });
    const h1 = document.createElement("h1");
    h1.appendChild(document.createTextNode(name));
    const videoGrid = document.createElement("div");
    videoGrid.classList.add("video-grid");
    videoGrid.appendChild(h1);
    videoGrid.append(videoEl);
    videoGrids.appendChild(videoGrid);
    RemoveUnusedDivs();
};

window.addEventListener("beforeunload", () => {
    socket.emit("user-disconnected", peer.id);
    if (myVideoStream) {
        myVideoStream.getTracks().forEach((track) => track.stop());
    }
    peer.destroy();
    clearVideos();
});

initMedia();