//Dominik Mifkovic


/*Ospravedlnujm sa za to ze je vsetko narvane v tomto subore namiesto toho aby bola
funkcionalita oddelena od serveru, uvedomil som si to neskoro, a uz nebol cas to pomenit
*/
const express = require('express');
const http = require('http');
const WebSocket = require('ws');
const path = require('path');
const crypto = require('crypto');
const PORT = 8080;
const app = express();
app.use(express.static(path.join(__dirname, 'static')));
app.use(express.json());



app.listen(PORT, () => console.log(`HTTP server is running at: ${PORT}`))
const wss = new WebSocket.Server({ port: 8082});
var spectatorSessions = new Set();
var sessions = {};
var registeredUsers = {};
registerUser('admin@admin.admin','admin','admin','admin');

//cez ws sa posiela info pre vykreslenie canvasu
wss.on('connection', (ws) => {
    const sessionId = generateSessionId();
    sessions[sessionId] = {
        ws,
        gameWidth: 80,
        gameHeight: 40,
        train: [],
        road: [],
        endpoint: null,
        cursor: { x: 0, y: 0 },
        renderWhite: false,
        downcounter: 5,
        paused: false,
        ival: null,
        speed: 1000,
        speedStep: 100,
        counter: 0,
        score: 0,
        high_score: 0,
        username: null,
        isGuest: true,
        picture: 0
    };
    const session = sessions[sessionId];
    const id_send = {
        id: sessionId,
        picture: session.picture
    };
    session.ws.send(JSON.stringify(id_send));
    console.log(`Client connected. Session ID: ${sessionId}`);

    ws.on('message', (message) => {
        
    });

    ws.on('close', () => {
        const session = sessions[sessionId];
        if(session){
            clearInterval(session.ival);
            delete sessions[sessionId];
            console.log(`Client ${session.username} disconnected from session ${sessionId}`);
        }
        
    });
});

//HTTP

app.post('/user_input', (req, res) => {
    const { message } = req.body;
    const {currSessionId, x, y, direction } = parseMessage(message);
    if (direction === 'ENTER') {
        handleEnterKey(currSessionId, x, y);
    } else {
        handleArrowKeys(currSessionId, direction);
    }
    res.status(200).send('OK');
});


app.post('/register', (req, res) => {
    const {email, username, password, confirmPassword } = req.body;
    if (registerUser(email, username, password, confirmPassword)) {
        res.status(200).send('Registration successful');
    } else {
        res.status(400).send('Registration failed');
    }
});

app.post('/login', (req, res) => {
    const { username, password ,currId} = req.body;
    if (loginUser(username, password)) {
        const session = sessions[currId];
        session.username = username;
        session.isGuest = false;
        res.status(200).json({username: session.username});
        initializeGame(currId);
    } else {
        res.status(401).send('Login failed');
    }
});


app.post('/guest', (req, res) => {
    const {currId} = req.body;
    initializeGame(currId);
    res.status(200).send();
});


app.get('/downcounter', (req, res) => {
    const sessionId = req.query.sessionId;
    const session = sessions[sessionId];
    if (session) {
        res.status(200).json({ downcounter: session.downcounter });
    } else {
        res.status(404).json({ error: 'Session not found' });
    }
});

app.get('/registered-accounts', (req, res) => {
    const registeredAccountsInfo = Object.values(registeredUsers).map(user => {
        return {
            username: user.username,
            email: user.email,
            password: user.password,
            high_score: user.high_score,
            speed: user.speed
        };
    });
    res.status(200).json(registeredAccountsInfo);
});

app.delete('/delete-account/:username', (req, res) => {
    const username = req.params.username;
    if (registeredUsers.hasOwnProperty(username)) {
        delete registeredUsers[username];
        res.sendStatus(204);
    } else {
        res.status(404).json({ error: 'Account not found' });
    }
});

app.post('/import-accounts', (req, res) => {
    const importedAccounts = req.body;
    const usernameRegex = /^[a-zA-Z]+$/;
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const invalidAccounts = [];

    importedAccounts.forEach(account => {
        const { username, email, password, high_score, speed } = account;
        if (registeredUsers[username] || Object.values(registeredUsers).some(user => user.email === email)) {
            invalidAccounts.push({ username, email, error: 'Username or email already exists.' });
        } else if (!usernameRegex.test(username) || !emailRegex.test(email)) {
            invalidAccounts.push({ username, email, error: 'Invalid username or email format.' });
        } else {
            registeredUsers[username] = { username, email, password, high_score, speed };
        }
    });
    if (invalidAccounts.length > 0) {
        return res.status(400).json({ error: 'Invalid accounts or duplicate usernames/emails.', invalidAccounts });
    }
    res.status(200).send('Import successful.');
});


app.get('/scores', (req, res) => {
    const scores = Object.keys(sessions).map(sessionId => {
        const session = sessions[sessionId];
        return {
            username: session.username,
            sessionId: sessionId,
            score: session.score,
            high_score: session.high_score
        };
    });
    res.status(200).json(scores);
});

app.get('/spectate/:currSessionId/:sessionId', (req, res) => {
    const sessionId = req.params.sessionId;
    const currSessionId = req.params.currSessionId;
    const session = sessions[sessionId];
    const currSession = sessions[currSessionId];
    spectatorSessions.add(currSessionId);
    spectatorSessions.delete(sessionId);
    currSession.paused = true;
    if (session) {
        const gameState = {
            train: session.train,
            road: session.road,
            endpoint: session.endpoint,
            cursor: session.cursor,
            renderWhite: true,
            id: sessionId
        };
        //console.log(`Sending game state for session ID ${sessionId} for spectating:`, gameState);
        res.status(200).json(gameState);
    } else {
        //console.log(`Session ID ${sessionId} not found for spectating.`);
        res.status(404).json({ error: 'Session not found' });
    }
});



//Pouzil som crypto cisto len kvoli hashu hesla
function hashPassword(password) {
    const hash = crypto.createHash('sha256');
    hash.update(password);
    return hash.digest('hex'); 
}


function registerUser(email, username, password, confirmPassword) {
    const usernameRegex = /^[a-zA-Z]+$/;
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!usernameRegex.test(username) || !emailRegex.test(email)) {
        return false; 
    }

    if (Object.values(registeredUsers).some(user => user.username === username || user.email === email)) {
        return false;
    }
    
    const hashedPassword = hashPassword(password);
    const hashedConfirmPassword = hashPassword(confirmPassword);
    if(hashedConfirmPassword != hashedPassword){
        return false;
    }

    registeredUsers[username] = {
        username: username,
        email: email,
        password: hashedPassword,
        high_score: 0,
        speed: 1000
    };

    return true; 
}

function loginUser(username, password) {
    if (registeredUsers[username]) {
        const hashedPassword = hashPassword(password);
        if (hashedPassword === registeredUsers[username].password) {
            return true;
        }
    }
    return false;
}

function initializeGame(sessionId) {
    const session = sessions[sessionId];
    session.train=[{
        x: Math.floor(session.gameWidth/2),
        y: Math.floor(session.gameHeight/2)
    }];
    for(var i=1;i<4;i++) {
        session.train.push({
            x: session.train[i-1].x,
            y: session.train[i-1].y+1
        });
    }
    session.endpoint = {
        x: random(0, session.gameWidth),
        y: random(0, session.gameHeight)
    };
    session.road = [];
    session.downcounter = 5;
    session.speed = 1000;
    session.counter = 0;

    const initialState = {
        train: session.train,
        road: session.road,
        endpoint: session.endpoint,
        cursor: session.cursor,
        renderWhite: session.renderWhite,
        id: sessionId
    };
    session.ws.send(JSON.stringify(initialState));
    downcount(sessionId,session.downcounter);
}

function handleArrowKeys(sessionID, direction) {
    const session = sessions[sessionID];
    if (direction === 'Down') {
        session.cursor.y++;
    } else if (direction === 'Up') {
        session.cursor.y--;
    } else if (direction === 'Left') {
        session.cursor.x++;
    } else if (direction === 'Right') {
        session.cursor.x--;
    }

    if (session.cursor.x < 0) {
        session.cursor.x = 0;
    } else if (session.cursor.x >= session.gameWidth) {
        session.cursor.x = session.gameWidth - 1;
    }

    if (session.cursor.y < 0) {
        session.cursor.y = 0;
    } else if (session.cursor.y >= session.gameHeight) {
        session.cursor.y = session.gameHeight - 1;
    }
    const gameState = {
        train:session.train,
        road:session.road,
        endpoint:session.endpoint,
        cursor:session.cursor,
        renderWhite: false,
        id: sessionID
    };
    session.ws.send(JSON.stringify(gameState));
}

function handleEnterKey(sessionID) {
    const session = sessions[sessionID];
    var index = -1;
    for(var i=0;i<session.road.length;i++) {
        if(session.road[i].x === session.cursor.x && session.road[i].y === session.cursor.y) {
            index = i;
            break;
        }
    }
    if(index > -1) {
        session.road.splice(index,1);
    }
    else {
        session.road.push({x: session.cursor.x, y: session.cursor.y});
    }
    const gameState = {
        train:session.train,
        road:session.road,
        endpoint:session.endpoint,
        cursor:session.cursor,
        renderWhite: false,
        id: sessionID
    };
    session.ws.send(JSON.stringify(gameState));
}

function resetGame(sessionId) {
    const session = sessions[sessionId];
    clearInterval(session.ival);
    session.speed = 1000;
    session.counter = 0;
    session.downcounter = 5;
    session.road = [];
    initializeGame(sessionId);
}

function nextLevel(sessionId) {
    const session = sessions[sessionId];
    clearInterval(session.ival);
    session.road = [];
    session.downcounter = 5;
    session.endpoint = {
        x: random(0, session.gameWidth),
        y: random(0, session.gameHeight)
    };
    initializeGame(sessionId);
}

function speedUp(sessionId, speedStep) {
    const session = sessions[sessionId];
    clearInterval(session.ival);
    session.speed -= speedStep;
    if (session.speed < 0) session.speed = 0;
    if(registeredUsers[session.username]){
        registeredUsers[session.username] = {
            speed: session.speed  
        }
    } 
    downcount(sessionId,session.downcounter);
}

async function downcount(sessionId, secs) {
    const session = sessions[sessionId];
    if (session == null) {
        return;
    }

    async function pause() {
        return new Promise(resolve => {
            const intervalId = setInterval(() => {
                if (!session.paused || spectatorSessions.has(sessionId)) {
                    clearInterval(intervalId);
                    resolve();
                }
            }, 100);
        });
    }

    while (session.paused && spectatorSessions.has(sessionId)) {
        await pause();
    }

    if (typeof secs === 'number') {
        await new Promise(resolve => setTimeout(resolve, 2000));

        if (secs === 0) {
            looping(sessionId);
        } else if (secs > 0) {
            session.downcounter--;
            await downcount(sessionId, session.downcounter);
        }
    } else {
        return;
    }
}

function looping(sessionId) {
    const session = sessions[sessionId];
    if(session == null){
        return;
    }
    session.ival = setInterval(() => {
        if (noNextMove(session.train, session.road)) {
            downcount(sessionId, 'FAILED');
            session.downcounter = 'FAILED';
            if(!session.isGuest){
                if(registeredUsers[session.username]?.high_score < session.score && !session.paused){
                    registeredUsers[session.username] = {
                        high_score: session.score  
                    }
                } 
            }else{
                if(session.score > session.high_score && !session.paused){
                    session.high_score = score;
                }
            }
            session.score = 0;
            resetGame(sessionId);
        }
        nextMove(sessionId);
        if (isEndpoint(session.train[0], session.endpoint)) {
            session.downcounter = 'WIN';
            session.score += 10;
            if(!session.isGuest){
                if(registeredUsers[session.username]?.high_score < session.score && !session.paused){
                    registeredUsers[session.username] = {
                        high_score: session.score  
                    }
                } 
            }else{
                if(session.score > session.high_score && !session.paused){
                    session.high_score = score;
                }
            }
            nextLevel(sessionId);
        }

        if (session.counter % 500 === 0 && session.counter > 0) {
            speedUp(sessionId, session.speed, session.speedStep);
        }
        session.counter++;

        const gameState = {
            train: session.train,
            road: session.road,
            endpoint: session.endpoint,
            cursor: session.cursor,
            renderWhite: true,
            id: sessionId
        };
        session.ws.send(JSON.stringify(gameState));
    }, session.speed);
}

function random(min, max) {
    if (typeof max === 'undefined') {
        max = min;
        min = 0;
    }
    return Math.floor(Math.random() * (max - min)) + min;
}

function noNextMove(train, road) {
    for (var i = 0; i < road.length; i++) {
        var point = road[i];
        if (
            Math.abs(train[0].y - point.y) <= 1 && Math.abs(train[0].x - point.x) <= 1
        ) {
            return false;
        }
    }
    return true;
}

function nextMove(sessionId) {
    const session = sessions[sessionId];
    var head = session.train[0];
    var nextX = head.x;
    var nextY = head.y;
    var match = -1;

    for (var i = 0; i < session.road.length; i++) {
        var point = session.road[i];
        if (Math.abs(head.y - point.y) <= 1 && Math.abs(head.x - point.x) <= 1) {
            match = i;
            break;
        }
    }

    if (match >= 0) {
        nextX = session.road[match].x;
        nextY = session.road[match].y;
        session.road.splice(match, 1);
    } else {
        nextX = head.x;
        nextY = head.y;
    }
    session.train.pop(); 
    session.train.unshift({ x: nextX, y: nextY }); 
}

function isEndpoint(head, endpoint) {
    return Math.abs(head.y - endpoint.y) <= 1 && Math.abs(head.x - endpoint.x) <= 1;
}

function parseMessage(message) {
    const [currSessionId,x, y, direction] = String(message).split(',');
    return {currSessionId: currSessionId, x: parseInt(x), y: parseInt(y), direction };
}

function generateSessionId() {
    return Math.random().toString(36).substring(7);
}