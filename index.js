const path=require('path');
const express=require('express');
const http=require("http");
const socketio=require('socket.io');
const jf = require('jsonfile')

const app=express();
const server=http.createServer(app);
const io=socketio(server);

const users = jf.readFileSync('users.json')

app.set('view engine', 'pug')

const publicDirectoryPath=path.join(__dirname,"/public");

app.use(express.static(publicDirectoryPath));

app.get('/', (req, res) => {
    res.render('./index', {
        users: users.users
    })
})

app.get('/timer', (req, res) => {
    res.render('./timer');
})

function addUser(username) {
    jf.readFile('users.json', async (err, obj) => {
        if (err) throw err;
        let fileObj = obj;
        fileObj.users.push({
            nickname: username
        })
        jf.writeFile('users.json', fileObj, {spaces:2}, async (err) => {if (err) throw err})
    })
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
    io.emit('timer is playing', {
        seconds: seconds,
        minutes: minutes,
        hours: hours
    });
    
}

io.on("connection", (client) => {

    client.on('user not logged in', () => {
        console.log('user not authorized')
        client.username = 'Anonymus'
    })

    client.on('messageFromClient', (msg) => {
        io.emit('messageFromServer', {message: msg, user: client.username});
    });

    client.on('disconnect', () => {
        console.log(`${client.username} disconnected`);
        io.emit('user disconnected', client.username)
    });

    client.on('user login', username => {
        console.log(`${username} came back!`);
        client.username = username;
    })

    client.on('signup', (username) => {
        console.log(`${username} just signed up!`)
        addUser(username);
    })

    client.on('user connected', username => {
        client.username = username
        io.emit('user logged in')
    })

    client.on('user on timer page', () => {
        if (intervalId) {
            io.emit('block start timer button')
            io.emit('receive latest data', {
                seconds: seconds,
                minutes: minutes,
                hours: hours
            })
        }
    })
    
    client.on('start timer', () => {
        seconds = (seconds < 10 ? "0" : "") + seconds;
        minutes = (minutes < 10 ? "0" : "") + minutes;
        hours = (hours < 10 ? "0" : "") + hours;
        intervalId = setInterval(updateTimer, 1000);
        io.emit('block start timer button')
    })
    
    client.on('stop timer', () => {
        clearInterval(intervalId)
        milliseconds = 0;
        seconds = 0;
        minutes = 0;
        hours = 0;
        io.emit('timer stopped')
    })
})

const port=process.env.PORT || 3000;
server.listen(port,()=>{
    console.log(`Server is up on port ${port}!`);
})