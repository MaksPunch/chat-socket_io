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

app.post('/login', (req, res) => {

})

io.on("connection",(client) => {
    client.on('user login', username => {
        console.log(`${username} came back!`);
        client.username = username;
    })

    client.on('new user', username => {
        console.log(`${username} just signed up!`)
        
        jf.readFile('users.json', (err, obj) => {
            if (err) throw err;
            let fileObj = obj;
            fileObj.users.push({
                nickname: username
            })
            jf.writeFile('users.json', fileObj, {spaces:2}, (err) => {if (err) throw err})
        })
        client.username = username;
        console.log(client.username)
    })

    client.on('user connected', (username) => {
        client.username = username
        io.emit('user logged in')
    })

    client.on('user not logged in', () => {
        console.log('user not authorized')
        client.username = 'Anonymus'
    })

    client.on('messageFromClient', (msg, username) => {
        console.log(client.username)
        io.emit('messageFromServer', {message: msg, user: username});
    });

    client.on('disconnect', () => {
        console.log('New websocket disconnected');
    });

})

const port=process.env.PORT || 3000;
server.listen(port,()=>{
    console.log(`Server is up on port ${port}!`);
})