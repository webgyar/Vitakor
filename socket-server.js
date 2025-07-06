const express = require("express");
const http = require("http");
const socketIo = require("socket.io");
const path = require("path");

const app = express();
const server = http.createServer(app);
const io = socketIo(server);

app.use(express.static(__dirname));

app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "vitakor.html"));
});

let onlineUsers = 0;
let users = [];

function matchUsers() {
  for (let i = 0; i < users.length; i++) {
    const user1 = users[i];
    if (user1.partner) continue;

    const user2 = users.find(
      (u, j) =>
        j !== i &&
        !u.partner &&
        u.party !== user1.party
    );

    if (user2) {
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
    const user = users.find(u => u.socket === socket);
    if (user && user.partner && user.partner.socket) {
      user.partner.socket.emit("message", {
        from: user.name,
        msg,
      });
    }
  });

  socket.on("disconnect", () => {
    onlineUsers--;
    io.emit("online", onlineUsers);

    const index = users.findIndex(u => u.socket === socket);
    if (index !== -1) {
      const user = users[index];
      if (user.partner) {
        user.partner.partner = null;
        user.partner.socket.emit("partner-left");
      }
      users.splice(index, 1);
      return;
    }

    const user = users.find(u => u.partner && u.partner.socket === socket);
    if (user && user.partner) {
      user.partner.partner = null;
      user.partner.socket.emit("partner-left");
    }
  });

  socket.on("new-partner", () => {
    const user = users.find(u => u.socket === socket);
    if (user) {
      if (user.partner) {
        user.partner.partner = null;
        user.partner.socket.emit("partner-left");
        user.partner = null;
      }
      matchUsers();
    }
  });
});

const PORT = process.env.PORT || 3002;
server.listen(PORT, () => {
  console.log(`✅ Szerver elindult a ${PORT} porton`);
});
