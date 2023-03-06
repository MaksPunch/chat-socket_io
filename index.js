const path = require("path");
const express = require("express");
const http = require("http");
const socketio = require("socket.io");
const jf = require("jsonfile");

const app = express();
const server = http.createServer(app);
const io = socketio(server);

const users = jf.readFileSync("users.json");

app.set("view engine", "pug");

const publicDirectoryPath = path.join(__dirname, "/public");

app.use(express.static(publicDirectoryPath));

app.get("/", (req, res) => {
  res.render("./index", {
    users: users.users,
  });
});

app.get("/timer", (req, res) => {
  res.render("./timer");
});

function addUser(username) {
  jf.readFile("users.json", (err, obj) => {
    if (err) throw err;
    let fileObj = obj;
    fileObj.users.push({
      nickname: username,
    });
    jf.writeFile("users.json", fileObj, { spaces: 2 }, (err) => {
      if (err) throw err;
    });
  });
}

function changeUsername(username, newUsername) {
  jf.readFile("users.json", (err, obj) => {
    if (err) throw err;
    let fileObj = obj;
    let id = fileObj.users.findIndex((el) => el.nickname == username);
    console.log(fileObj.users, id, username);
    fileObj.users[id].nickname = newUsername;
    jf.writeFile("users.json", fileObj, { spaces: 2 }, (err) => {
      if (err) throw err;
    });
  });
}

let seconds = 0;
let minutes = 0;
let hours = 0;
let intervalId;

function updateTimer() {
  seconds++;
  if (seconds == 60) {
    seconds = 0;
    minutes++;
    minutes = (minutes < 10 ? "0" : "") + minutes;
  }
  if (minutes == 60) {
    minutes = 0;
    hours++;
    seconds = (seconds < 10 ? "0" : "") + seconds;
    minutes = (minutes < 10 ? "0" : "") + minutes;
    hours = (hours < 10 ? "0" : "") + hours;
  }
  io.emit("timer is playing", {
    seconds: seconds,
    minutes: minutes,
    hours: hours,
  });
}

io.on("connection", (client) => {
  client.on("change room", (room) => {
    io.sockets.in(client.room).emit("room left", { name: client.username, room: client.room });
    client.leave(client.room);
    client.join(room);
    client.room = room;
    console.log(room, "room");
    io.sockets.in(client.room).emit("room changed", { name: client.username, room: client.room });
  });

  client.on("user not logged in", () => {
    console.log("user not authorized");
    client.username = "Anonymus";
  });

  client.on("messageFromClient", (msg) => {
    console.log("client room", client.room, msg);
    io.sockets.in(client.room).emit("messageFromServer", { message: msg, user: client.username });
  });

  client.on("disconnect", () => {
    console.log(`${client.username} disconnected`);
    io.to(client.room).emit("user disconnected", client.username);
  });

  client.on("user login", (username) => {
    console.log(`${username} came back!`);
  });

  client.on("signup", (username) => {
    console.log(`${username} just signed up!`);
    addUser(username);
  });

  client.on("user connected", (username) => {
    client.join("room 1");
    client.room = "room 1";
    client.username = username;
    io.to(client.room).emit("user logged in", { name: client.username, room: client.room });
  });

  client.on("new username", (username) => {
    io.emit("user changed username", { old: client.username, new: username });
    changeUsername(client.username, username);
    client.username = username;
  });

  client.on("user on timer page", () => {
    if (intervalId) {
      io.emit("block start timer button");
      io.emit("receive latest data", {
        seconds: seconds,
        minutes: minutes,
        hours: hours,
      });
    }
  });

  client.on("start timer", () => {
    seconds = (seconds < 10 ? "0" : "") + seconds;
    minutes = (minutes < 10 ? "0" : "") + minutes;
    hours = (hours < 10 ? "0" : "") + hours;
    intervalId = setInterval(updateTimer, 1000);
    io.emit("block start timer button");
  });

  client.on("stop timer", () => {
    clearInterval(intervalId);
    milliseconds = 0;
    seconds = 0;
    minutes = 0;
    hours = 0;
    io.emit("timer stopped");
  });
});

const port = process.env.PORT || 8080;
server.listen(port, () => {
  console.log(`Server is up on port ${port}!`);
});
