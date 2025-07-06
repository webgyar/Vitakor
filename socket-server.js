const express = require("express");
const http = require("http");
const path = require("path");
const socketIo = require("socket.io");
const fs = require("fs");

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
  cors: { origin: "*" },
});

app.use(express.static(__dirname));

app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "vitakor.html"));
});


let onlineUsers = 0;
let users = [];

function matchUsers() {
  while (users.length >= 2) {
    const user1 = users.shift();
    const user2 = users.find((u) => u.party !== user1.party);

    if (!user2) {
      users.unshift(user1);
      return;
    }

    users = users.filter((u) => u !== user2);

    user1.partner = user2;
    user2.partner = user1;

    user1.socket.emit("partner-found", {
      name: user2.name,
      party: user2.party,
    });

    user2.socket.emit("partner-found", {
      name: user1.name,
      party: user1.party,
    });
  }
}

io.on("connection", (socket) => {
  onlineUsers++;
  io.emit("online", onlineUsers);

  socket.on("register", ({ name, party }) => {
    const user = { socket, name, party, partner: null };
    users.push(user);
    matchUsers();
  });

  socket.on("message", (msg) => {
    const user = users.find((u) => u.socket === socket);
    if (user?.partner) {
      user.partner.socket.emit("message", {
        from: user.name,
        msg,
      });
    }
  });

  socket.on("disconnect", () => {
    onlineUsers--;
    io.emit("online", onlineUsers);
    const index = users.findIndex((u) => u.socket === socket);
    if (index !== -1) {
      const user = users.splice(index, 1)[0];
      if (user.partner) {
        user.partner.socket.emit("partner-left");
        users.push(user.partner);
        matchUsers();
      }
    }
  });
});


const PORT = process.env.PORT || 3002;
server.listen(PORT, () => {
  console.log(`Szerver fut: http://localhost:${PORT}`);
});
