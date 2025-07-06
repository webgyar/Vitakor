const express = require("express");
const http = require("http");
const socketIo = require("socket.io");

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
  cors: { origin: "*" }
});

let onlineCount = 0;
let waitingUsers = [];

io.on("connection", (socket) => {
  onlineCount++;
  io.emit("online", onlineCount);

  let currentUser = null;

  socket.on("register", ({ name, party }) => {
    const cleanParty = (party || "").trim().toLowerCase();
    currentUser = { socket, name, party: cleanParty, partner: null };
    console.log(`🟢 Regisztrált: ${name} (${cleanParty})`);
    waitingUsers.push(currentUser);
    matchUsers();
  });

  socket.on("message", (text) => {
    if (currentUser?.partner) {
      currentUser.partner.socket.emit("message", {
        from: currentUser.name,
        text
      });
    }
  });

  socket.on("new-partner", () => {
    if (currentUser?.partner) {
      currentUser.partner.socket.emit("partner-left");
      currentUser.partner.partner = null;
      waitingUsers.push(currentUser.partner);
    }
    currentUser.partner = null;
    waitingUsers.push(currentUser);
    matchUsers();
  });

  socket.on("disconnect", () => {
    onlineCount--;
    io.emit("online", onlineCount);

    if (!currentUser) return;

    if (currentUser.partner) {
      currentUser.partner.socket.emit("partner-left");
      currentUser.partner.partner = null;
      waitingUsers.push(currentUser.partner);
    }

    waitingUsers = waitingUsers.filter(u => u.socket.id !== socket.id);
    console.log(`❌ Kilépett: ${currentUser.name} (${currentUser.party})`);
  });

  function matchUsers() {
    console.log("🔍 Párosítás próbálkozás...");
    for (let i = 0; i < waitingUsers.length; i++) {
      const userA = waitingUsers[i];
      if (userA.partner) continue;

      for (let j = i + 1; j < waitingUsers.length; j++) {
        const userB = waitingUsers[j];
        if (userB.partner) continue;

        // normált pártok (kisbetű + trim)
        const partyA = (userA.party || "").trim().toLowerCase();
        const partyB = (userB.party || "").trim().toLowerCase();

        console.log(`🔎 Vizsgálat: ${userA.name} (${partyA}) ↔ ${userB.name} (${partyB})`);

        if (partyA && partyB && partyA !== partyB) {
          userA.partner = userB;
          userB.partner = userA;

          userA.socket.emit("partner-found", {
            name: userB.name,
            party: userB.party
          });

          userB.socket.emit("partner-found", {
            name: userA.name,
            party: userA.party
          });

          console.log(`✅ Párosítva: ${userA.name} ↔ ${userB.name}`);

          waitingUsers = waitingUsers.filter(u => u !== userA && u !== userB);
          return;
        } else {
          console.log(`❌ Nem párosítható – azonos párt: ${partyA}`);
        }
      }
    }
    console.log("⚠️ Nincs megfelelő partner.");
  }
});

server.listen(3002, () => {
  console.log("🚀 Socket.IO szerver fut a 3002-es porton");
});
