const path = require("path");
const express = require("express");
const http = require("http");
const socketio = require("socket.io");
const jf = require("jsonfile");

const app = express();
const server = http.createServer(app);
const fs = require("fs");
const {Server} = require('socket.io')

const io = new Server(server, {
  maxHttpBufferSize: 1e7
})

const users = jf.readFileSync("users.json");
let users_counter = 0;
const rooms = {
  "room 1": 0,
  "room 2": 0,
  "room 3": 0
}

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
    rooms[client.room]--;
    console.log(rooms, "before")
    io.sockets.in(client.room).emit("room left", { name: client.username, room: client.room, room: client.room, rooms_data: rooms  });
    client.leave(client.room);

    client.join(room);
    client.room = room;
    rooms[client.room]++;
    console.log(rooms, "after")

    io.sockets.in(client.room).emit("room changed", { name: client.username, room: client.room, rooms_data: rooms });
  });

  client.on("user not logged in", () => {
    console.log("user not authorized");
    client.username = "Anonymus";
  });

  client.on("messageFromClient", (msg) => {
    console.log("client room", client.username, msg);
    io.sockets.in(client.room).emit("messageFromServer", { message: msg.msg, user: client.username, file: msg.file });
  });

  client.on("disconnect", () => {
    if (client.username)  {
      users_counter--;
      rooms[client.room]--
    }
    console.log(rooms)
    console.log(`${client.username} disconnected`);
    io.emit('user disconnected of chat', {counter: users_counter, room: client.room, rooms_data: rooms});
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
    users_counter++;
    client.join("room 1");
    client.room = "room 1";
    rooms[client.room]++;
    client.username = username;
    console.log(rooms, users_counter, client.room, rooms[client.room])
    io.sockets.emit('user logged in in chat', {counter: users_counter, room: client.room, rooms_data: rooms})
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

  client.on("upload", (file, callback) => {
    console.log(file.filename); // <Buffer 25 50 44 ...>

    // save the content to the disk, for example
    fs.writeFile("./public/img/"+file.filename, file.file, (err) => {
      callback({ message: err ? "failure: " + err : "success" });
      io.sockets.to(client.room).emit('upload end', {status: true, filepath: "img/"+file.filename})
    });
  });
});

const port = process.env.PORT || 8080;
server.listen(port, () => {
  console.log(`Server is up on port ${port}!`);
});
