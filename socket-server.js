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
    const user2Index = users.findIndex(
      (u, j) => j !== i && u.party !== user1.party && !u.partner
    );

    if (user2Index !== -1) {
      const user2 = users[user2Index];

      
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

     
      users = users.filter((u) => u !== user1 && u !== user2);
      break; 
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
    const user = [...users, ...users.flatMap(u => u.partner ? [u.partner] : [])]
      .find(u => u.socket === socket);

    if (user?.partner?.socket) {
      user.partner.socket.emit("message", {
        from: user.name,
        msg,
      });
    }
  });

  socket.on("disconnect", () => {
    onlineUsers--;
    io.emit("online", onlineUsers);

    let userIndex = users.findIndex(u => u.socket === socket);
    if (userIndex !== -1) {
      users.splice(userIndex, 1);
      return;
    }

    const user = [...users, ...users.flatMap(u => u.partner ? [u.partner] : [])]
      .find(u => u.partner?.socket === socket);

    if (user) {
      const partner = user.partner;
      user.partner = null;

      partner.socket.emit("partner-left");
      partner.partner = null;
      users.push(partner);
      matchUsers();
    }
  });
});

const PORT = process.env.PORT || 3002;
server.listen(PORT, () => {
  console.log(`✅ Szerver elindult a ${PORT} porton`);
});
