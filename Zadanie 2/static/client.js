//Dominik Mifkovic

var socket = new WebSocket('ws://localhost:8082');
var cursor = {x:0, y:0};
var prevcursor = {};
var gameWidth = 80;
var gameHeight = 40;
var gameState;
var context;
var canvas;
var currId = null;
var currUsername = 'Guest';
var initGameState;
var session_paused = false;
var spectating = false;
var train_picture;

//funkcia pre vytvorenie  skore tabulky a spectate tlacitok
function createScoresTable() {
    const table = document.createElement('table');
    table.style.cssText = 'float: right; margin-top: 20px; margin-right: 200px; border-collapse: collapse; width: 500px;';
    document.body.appendChild(table);
    let spectatingSessionId = null;
    let originalSessionId = null;

    function fetchScores() {
        fetch('/scores')
            .then(response => response.json())
            .then(scores => {
                scores.sort((a, b) => b.score - a.score);
                table.innerHTML = '';

                const headerRow = document.createElement('tr');
                headerRow.style.backgroundColor = '#f2f2f2';
                headerRow.style.fontWeight = 'bold';
                headerRow.innerHTML = '<th>Rank</th><th>Username</th><th>Session ID</th><th>Current Score</th><th>High Score</th><th>Action</th>';
                table.appendChild(headerRow);

                scores.forEach((score, index) => {
                    const row = document.createElement('tr');
                    row.style.textAlign = 'center';
                    row.style.border = '1px solid #dddddd';
                    if (index === 0) {
                        row.style.backgroundColor = '#7aeb34';
                    }

                    row.innerHTML = `<td>${index + 1}</td><td>${score.username}</td><td>${score.sessionId}</td><td>${score.score}</td><td>${score.high_score}</td>`;

                    const buttonCell = document.createElement('td');
                    const spectateButton = document.createElement('button');
                    const returnButton = document.createElement('button');

                    if (score.sessionId !== currId) {
                        if (score.sessionId === spectatingSessionId) {
                            spectateButton.textContent = 'Stop Spectating';
                        } else {
                            spectateButton.textContent = 'Spectate';
                        }
                        spectateButton.addEventListener('click', () => {
                            if (spectatingSessionId === null) {
                                originalSessionId = currId;
                                startSpectating(score.sessionId);
                                spectatingSessionId = score.sessionId;
                                alert('Refreshing of the page is needed for canceling spectating.');
                            } else if (spectatingSessionId === score.sessionId) {
                                stopSpectating();
                                spectatingSessionId = null;
                                originalSessionId = null;
                            }
                            fetchScores();
                        });
                        buttonCell.appendChild(spectateButton);
                    } else if (score.sessionId === originalSessionId) {
                        returnButton.textContent = 'Return to Session';
                        returnButton.addEventListener('click', () => {
                            stopSpectating();
                            spectatingSessionId = null;
                            originalSessionId = null;
                            fetchScores();
                        });
                        buttonCell.appendChild(returnButton);
                    } else {
                        buttonCell.textContent = ''; 
                    }
                    row.appendChild(buttonCell);
                    table.appendChild(row);
                });
            })
            .catch(error => {
                console.error('Error fetching scores:', error);
            });
    }

    fetchScores();
    setInterval(() => fetchScores(), 1000);
}

function spectateSession(sessionId) {
    renderAllWhite();
    fetch(`/spectate/${currId}/${sessionId}`)
    .then((response) => {
        if (!response.ok) {
            throw new Error(`Error spectating session: ${response.statusText}`);
        }
        return response.json();
    })
    .then((gameState) => {
        if (gameState) {
            updateGameUI(gameState);
        } else {
            console.error('Invalid game state received from server.');
        }
    })
    .catch((error) => {
        console.error(`Error spectating session: ${error.message}`);
    });
}

function startSpectating(sessionId) {
    spectating = true;
    setInterval(() => {
        spectateSession(sessionId);
    }, 500);
}

socket.addEventListener('message', (event) => {
    gameState = JSON.parse(event.data);
    initGameState = gameState;
    if(currId == null){
        const {id,picture} = gameState;
        currId = id;
        train_picture = picture;
    }else if(!spectating){
        updateGameUI(gameState);
    }  
});

//funkcia pre login screen
function addLoginInfo(){
    document.body.innerHTML = '';  
    var loginForm = document.createElement('div');
    var buttonContainer = document.createElement('div');
    loginForm.innerHTML = '<h2 style="color: #3498db;">Login</h2>' +
        '<label for="loginUsername" style="color: #333; margin-right: 10px;">Username:</label>' +
        '<input type="text" id="loginUsername" required style="padding: 8px; border-radius: 5px; border: 1px solid #ccc; width: 150px; margin-bottom: 10px;"><br>' +
        '<label for="loginPassword" style="color: #333; margin-right: 10px;">Password:</label>' +
        '<input type="password" id="loginPassword" required style="padding: 8px; border-radius: 5px; border: 1px solid #ccc; width: 150px; margin-bottom: 10px;"><br>' +
        '<button onclick="loginUser()" style="background-color: #3498db; color: #fff; padding: 10px 20px; border: none; border-radius: 5px; cursor: pointer; transition: background-color 0.3s; margin-bottom: 10px;">Login</button>' +
        '<button onclick="addRegisterInfo()" style="background-color: #2ecc71; color: #fff; padding: 10px 20px; border: none; border-radius: 5px; cursor: pointer; transition: background-color 0.3s; margin-bottom: 10px;">Register account</button>' +
        '<button onclick="guest()" style="background-color: #e67e22; color: #fff; padding: 10px 20px; border: none; border-radius: 5px; cursor: pointer; transition: background-color 0.3s;">Play as guest</button>';
    
    var containerStyle = 'text-align: center; margin: 50px auto; padding: 20px; border: 1px solid #ccc; border-radius: 10px; width: 200px; background-color: white;';
    var buttonContainerStyle = 'margin-top: 10px;';
    document.body.style.backgroundColor = '#add8e6'; 
    
    loginForm.style = containerStyle;
    buttonContainer.style = buttonContainerStyle;
    
    buttonContainer.appendChild(loginForm);

    var imageSelection = document.createElement('div');
    imageSelection.innerHTML = '<h3>Select Train Image:</h3>' +
        '<input type="radio" id="trainImage1" name="trainImage" value="train1" checked>' +
        '<label for="trainImage1"><img src="https://upload.wikimedia.org/wikipedia/commons/1/17/Train_-_The_Noun_Project.svg" width="50"></label>' +
        '<input type="radio" id="trainImage2" name="trainImage" value="train2">' +
        '<label for="trainImage2"><img src="https://live.staticflickr.com/2905/33362377546_152ba4e27a_b.jpg" width="50"></label>' +
        '<input type="radio" id="trainImage3" name="trainImage" value="train3">' +
        '<label for="trainImage3"><img src="https://upload.wikimedia.org/wikipedia/commons/9/99/Star_icon_stylized.svg" width="50"></label>';
    buttonContainer.appendChild(imageSelection);
    document.body.appendChild(buttonContainer);
    /*
    Licencia a zdroj na obrazky:
    "File:Train - The Noun Project.svg" by undefined is marked with CC0 1.0. To view the terms, visit http://creativecommons.org/publicdomain/zero/1.0/deed.en?ref=openverse.

    "herbe / grass" by Légendes Lorraines is marked with Public Domain Mark 1.0. To view the terms, visit https://creativecommons.org/publicdomain/mark/1.0//?ref=openverse.

    "Star icon stylized" by artokem is marked with CC0 1.0. To view the terms, visit https://creativecommons.org/publicdomain/zero/1.0/deed.en?ref=openverse.
    */  
}

//funkcia pre register screen
function addRegisterInfo(){
    document.body.innerHTML = '';  
    var registerForm = document.createElement('div');
    var buttonContainer = document.createElement('div');
    registerForm.innerHTML = '<h2 style="color: #3498db;">Register</h2>' +
        '<label for="registerUsername" style="color: #333; margin-right: 10px;">Username:</label>' +
        '<input type="text" id="registerUsername" required style="padding: 8px; border-radius: 5px; border: 1px solid #ccc; width: 200px; margin-bottom: 10px;"><br>' +
        '<label for="registerEmail" style="color: #333; margin-right: 10px;">Email:</label>' +
        '<input type="email" id="registerEmail" required style="padding: 8px; border-radius: 5px; border: 1px solid #ccc; width: 200px; margin-bottom: 10px;"><br>' +
        '<label for="registerPassword" style="color: #333; margin-right: 10px;">Password:</label>' +
        '<input type="password" id="registerPassword" required style="padding: 8px; border-radius: 5px; border: 1px solid #ccc; width: 200px; margin-bottom: 10px;"><br>' +
        '<label for="confirmPassword" style="color: #333; margin-right: 10px;">Confirm Password:</label>'+
        '<input type="password" id="confirmPassword" required style="padding: 8px; border-radius: 5px; border: 1px solid #ccc; width: 200px; margin-bottom: 10px;"><br>'+
        '<button onclick="registerUser()" style="background-color: #3498db; color: #fff; padding: 10px 20px; border: none; border-radius: 5px; cursor: pointer; transition: background-color 0.3s; margin-bottom: 10px;">Register</button>';
    
    buttonContainer.innerHTML = '<button onclick="addLoginInfo()" style="background-color: #e67e22; color: #fff; padding: 10px 20px; border: none; border-radius: 5px; cursor: pointer; transition: background-color 0.3s;">Back to Login</button>';
    
    var containerStyle = 'text-align: center; margin: 50px auto; padding: 20px; border: 1px solid #ccc; border-radius: 10px; width: 250px; background-color: white;';
    var buttonContainerStyle = 'margin-top: 10px;';
    document.body.style.backgroundColor = '#add8e6';
    
    registerForm.style = containerStyle;
    buttonContainer.style = buttonContainerStyle;
    
    buttonContainer.appendChild(registerForm);
    document.body.appendChild(buttonContainer);
}

addLoginInfo();

function addInfo() {
    if(currUsername=='admin'){
        adminMode();
    }
    var sess = document.createElement('div');
    sess.innerHTML = '<h1 id="Session">Not fetched yet</h1>';
    document.body.appendChild(sess);
    var counter = document.createElement('div');
    counter.innerHTML = '<h3 id="downcount"></h3>';
    document.body.appendChild(counter);
    createScoresTable();
}


function registerUser() {
    const username = document.getElementById('registerUsername').value;
    const email = document.getElementById('registerEmail').value;
    const password = document.getElementById('registerPassword').value;
    const confirmPassword = document.getElementById('confirmPassword').value;
    fetch('/register', {
        method: 'POST',
        body: JSON.stringify({ username, email, password, confirmPassword }),
        headers: {
            'Content-Type': 'application/json'
        }
    })
    .then(response => response.text())
    .then(data => {
        alert(data);
    });

    addLoginInfo();
}

function loginUser() {
    const username = document.getElementById('loginUsername').value;
    const password = document.getElementById('loginPassword').value;
    const selectedTrainImage = document.querySelector('input[name="trainImage"]:checked').value;
    var resp;
    fetch('/login', {
        method: 'POST',
        body: JSON.stringify({ username, password, currId, selectedTrainImage}),
        headers: {
            'Content-Type': 'application/json'
        }
    })
    .then(response => response.text())
    .then(data => {
        alert(data);
        resp = JSON.parse(data);
        if(String(resp.username) === String(username)){
            document.body.innerHTML = '';  
            currUsername = resp.username;
            addInfo();
            canvas = createCanvas(gameWidth, gameHeight);
            context = canvas.getContext('2d');
            renderAllWhite();
            getUpdatedDowncounter();
            updateGameUI(initGameState);
        }
    });  
}

function guest(){
    fetch('/guest', {
        method: 'POST',
        body: JSON.stringify({currId}),
        headers: {
            'Content-Type': 'application/json'
        }
    });
    document.body.innerHTML = '';  
    addInfo();
    canvas = createCanvas(gameWidth, gameHeight);
    context = canvas.getContext('2d');
    renderAllWhite();
    getUpdatedDowncounter();
    currUsername = 'Guest';
    updateGameUI(initGameState);
    
}

function convertToCSV(data) {
    const csv = data.map(row => Object.values(row).join(',')).join('\n');
    return csv;
}

function convertCSVtoJSON(csvData) {
    const lines = csvData.split('\n');
    const headers = lines[0].split(',');
    const result = [];
    
    for (let i = 1; i < lines.length; i++) {
        const line = lines[i].split(',');
        if (line.length === headers.length) {
            const obj = {};
            for (let j = 0; j < headers.length; j++) {
                obj[headers[j]] = line[j];
            }
            result.push(obj);
        }
    }
    
    return result;
}


//funkcia cisto len pre admina ked je prihlaseny
//vytvara sa tu aj tabulka userov, prebieha tu import a export
//po importe sa pravdepodobne bude treba relognut za admina aby boli vidno importnute udaje, nejako mi to blblo obcas
function adminMode() {
    const importInput = document.createElement('input');
    importInput.type = 'file';
    importInput.accept = '.csv';
    importInput.style.marginTop = '20px';

    const importButton = document.createElement('button');
    importButton.textContent = 'Import CSV';
    importButton.addEventListener('click', () => {
        const file = importInput.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = function(event) {
                const csvData = event.target.result;
                const csvRows = csvData.split('\n');
                const importedAccounts = [];
                for (let i = 0; i < csvRows.length; i++) {
                    const row = csvRows[i].trim();
                    if (row) {
                        const [username, email, password, high_score, speed] = row.split(',');
                        importedAccounts.push({
                            username,
                            email,
                            password,
                            high_score: parseInt(high_score),
                            speed: parseInt(speed)
                        });
                    }
                }
    
                fetch('/import-accounts', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify(importedAccounts),
                })
                .then(response => {
                    if (response.ok) {
                        //console.log('Imported data sent successfully.');
                        refreshTable();
                    } else {
                        throw new Error('Network response error');
                    }
                })
                .catch(error => {
                    console.error('Error sending imported data:', error);
                });
            };
            reader.readAsText(file);
        } else {
            alert('Please select a CSV file to import.');
        }
    });

    document.body.appendChild(importInput);
    document.body.appendChild(importButton);
    const exportButton = document.createElement('button');
    exportButton.textContent = 'Export to CSV';
    exportButton.style.marginTop = '20px';
    exportButton.addEventListener('click', () => {
    const csvData = convertToCSV(data);
    const blob = new Blob([csvData], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'registered_users.csv';
    document.body.appendChild(a);
    a.click();
    URL.revokeObjectURL(url);
    });
    document.body.appendChild(exportButton);

    function createTable(data) {
        const table = document.createElement('table');
        table.id = 'admintable';
        table.style.width = '100%';
        table.style.borderCollapse = 'collapse';
        table.style.marginTop = '20px';
        const headerRow = table.insertRow();
        headerRow.style.backgroundColor = '#f2f2f2';
        headerRow.style.fontWeight = 'bold';
        headerRow.style.textAlign = 'left';

        const usernameHeader = headerRow.insertCell();
        usernameHeader.textContent = 'Username';
        usernameHeader.style.padding = '10px';
        usernameHeader.style.border = '1px solid #ddd';

        const emailHeader = headerRow.insertCell();
        emailHeader.textContent = 'Email';
        emailHeader.style.padding = '10px';
        emailHeader.style.border = '1px solid #ddd';

        const passwordHeader = headerRow.insertCell();
        passwordHeader.textContent = 'Password';
        passwordHeader.style.padding = '10px';
        passwordHeader.style.border = '1px solid #ddd';

        const hsHeader = headerRow.insertCell();
        hsHeader.textContent = 'High score';
        hsHeader.style.padding = '10px';
        hsHeader.style.border = '1px solid #ddd';

        const speedHeader = headerRow.insertCell();
        speedHeader.textContent = 'Speed';
        speedHeader.style.padding = '10px';
        speedHeader.style.border = '1px solid #ddd';

        const actionHeader = headerRow.insertCell();
        actionHeader.textContent = 'Actions';
        actionHeader.style.padding = '10px';
        actionHeader.style.border = '1px solid #ddd';

        data.forEach(account => {
            const row = table.insertRow();
        
            const usernameCell = row.insertCell();
            usernameCell.textContent = account.username;
            usernameCell.style.padding = '10px';
            usernameCell.style.border = '1px solid #ddd';
        
            const emailCell = row.insertCell();
            emailCell.textContent = account.email;
            emailCell.style.padding = '10px';
            emailCell.style.border = '1px solid #ddd';
        
            const passwordCell = row.insertCell();
            passwordCell.textContent = account.password; 
            passwordCell.style.padding = '10px';
            passwordCell.style.border = '1px solid #ddd';
        
            const high_scoreCell = row.insertCell();
            high_scoreCell.textContent = account.high_score;
            high_scoreCell.style.padding = '10px';
            high_scoreCell.style.border = '1px solid #ddd';

            const speedCell = row.insertCell();
            speedCell.textContent = account.speed;
            speedCell.style.padding = '10px';
            speedCell.style.border = '1px solid #ddd';

            const deleteCell = row.insertCell();
            const deleteButton = document.createElement('button');
            deleteButton.textContent = 'Delete';
            deleteButton.addEventListener('click', (usernameToDelete => {
                return () => {
                    if(usernameToDelete != 'admin'){
                        fetch(`/delete-account/${usernameToDelete}`, {
                            method: 'DELETE'
                        })
                        .then(response => {
                            if (response.ok) {
                                refreshTable();
                            } else {
                                throw new Error('Network response was not ok');
                            }
                        })
                        .catch(error => {
                            console.error('Error deleting account:', error);
                        });
                        refreshTable();
                    }else{
                        alert('Can\'t delete admin!');
                    }
                };
            })(account.username));
    
            deleteCell.appendChild(deleteButton);
            deleteCell.style.padding = '10px';
            deleteCell.style.border = '1px solid #ddd';
        });
        document.body.appendChild(table);
    }

    function refreshTable() {
        fetch('/registered-accounts')
            .then(response => {
                if (!response.ok) {
                    throw new Error('Network response error');
                }
                return response.json();
            })
            .then(data => {
                const existingTable = document.getElementById('admintable');
                if (existingTable) {
                    existingTable.remove();
                }
                const newTable = createTable(data);
                document.body.appendChild(newTable);
            })
            .catch(error => {
                console.error('Error fetching registered accounts data:', error);
            });
    }
    fetch('/registered-accounts')
        .then(response => {
            if (!response.ok) {
                throw new Error('Network response error');
            }
            return response.json();
        })
        .then(data => {            
            createTable(data);
        })
        .catch(error => {
            console.error('Error fetching registered accounts data:', error);
        });  
}

function createCanvas(gameWidth, gameHeight) {
    var game_container = document.createElement('DIV');
    game_container.innerHTML = '<div class="game_container"></div>';
    document.body.appendChild(game_container);
    const canvas = document.createElement('canvas');
    canvas.id = 'game_canvas';
    canvas.width = gameWidth * 10;
    canvas.height = gameHeight * 10;
    document.querySelector('.game_container').appendChild(canvas);
    return canvas;
}

//odosielanie user inputu na server
document.addEventListener('keydown', (event) => {
    let message = '';
    var prevcursor = cursor;
    if(!spectating){
        if (event.keyCode === 40) {
            unrenderCoursor(prevcursor);
            message = cursor.x + ',' + cursor.y + ',Down'; 
        } else if (event.keyCode === 38) {
            unrenderCoursor(prevcursor);
            message = cursor.x + ',' + cursor.y + ',Up';
        } else if (event.keyCode === 39) {
            unrenderCoursor(prevcursor);
            message = cursor.x + ',' + cursor.y + ',Left';
        } else if (event.keyCode === 37) {
            unrenderCoursor(prevcursor);
            message = cursor.x + ',' + cursor.y + ',Right';
        } else if(event.keyCode === 13) {
            message = cursor.x + ',' + cursor.y + ',ENTER';
        }
        message = currId + ',' + message;
        if (message) {
            fetch('/user_input', {
                method: 'POST',
                body: JSON.stringify({message}),
                headers: {
                    'Content-Type': 'application/json'
                }
            });
        }
    }
});

function getUpdatedDowncounter() {
    setInterval(() => {
        if(!session_paused){
        fetch(`/downcounter?sessionId=${currId}`)
            .then(response => response.json())
            .then(data => {
                const downcounter = data.downcounter;
                document.getElementById('downcount').innerHTML = 'Time left: ' + downcounter;
            })
            .catch(error => {
                document.getElementById('downcount').innerHTML = 'Error getting downcounter';
            });}
        else{
            document.getElementById('downcount').innerHTML = 'Spectating...';
        }
    }, 1000);
}

function getSelectedTrainImage() {
    var selectedImageElement = document.querySelector('input[name="trainImage"]:checked');
    var selectedImageValue = selectedImageElement ? selectedImageElement.value : 'default';
    var imageMap = {
        'train1': 'https://upload.wikimedia.org/wikipedia/commons/1/17/Train_-_The_Noun_Project.svg',
        'train2': 'https://live.staticflickr.com/2905/33362377546_152ba4e27a_b.jpg',
        'train3': 'https://upload.wikimedia.org/wikipedia/commons/9/99/Star_icon_stylized.svg',
        'default': 'https://upload.wikimedia.org/wikipedia/commons/1/17/Train_-_The_Noun_Project.svg'
    };
    return imageMap[selectedImageValue];
}

function updateGameUI(gameState) {
    var { train, road, endpoint, cursor, renderWhite, id } = gameState;
    var selectedTrainImage = getSelectedTrainImage();
    if(!spectating){
        document.getElementById('Session').innerHTML = 'User: '+ currUsername +' | Session: ' + id;
    }else{
        document.getElementById('Session').innerHTML = 'Spectating: '+ currUsername +' | Session: ' + id;
    }
    
    currId = id;
    if (renderWhite) {
        context.clearRect(0, 0, canvas.width, canvas.height);
        renderAllWhite();
    }

    road.forEach(point => {
        context.fillStyle = 'green';
        context.fillRect(point.x * 10, point.y * 10, 10, 10);
    });

    renderTrain(train, selectedTrainImage);
    context.fillStyle = 'yellow';
    context.fillRect(endpoint.x * 10, endpoint.y * 10, 10, 10);

    renderCoursor(cursor);
}

function renderAllWhite() {
    context.clearRect(0, 0, canvas.width, canvas.height);
    context.strokeStyle = 'gray';
    for (let x = 0; x <= gameWidth; x++) {
        context.beginPath();
        context.moveTo(x * 10, 0);
        context.lineTo(x * 10, canvas.height);
        context.stroke();
    }
    for (let y = 0; y <= gameHeight; y++) {
        context.beginPath();
        context.moveTo(0, y * 10);
        context.lineTo(canvas.width, y * 10);
        context.stroke();
    }
}

/*function renderTrainPoint(x, y) {
    context.fillStyle = 'red';
    context.fillRect(x * 10, y * 10, 10, 10);
}*/

function renderTrain(train, selectedTrainImage) {
    train.forEach(point => {
        var trainImage = new Image();
        trainImage.src = selectedTrainImage;
        context.drawImage(trainImage, point.x * 10, point.y * 10, 10, 10);
    });
}

function renderCoursor(cursor) {
    var x = cursor.x;
    var y = cursor.y;
    context.fillStyle = 'blue';
    context.fillRect(x * 10, y * 10, 10, 10);
}

function unrenderCoursor(cursor) {
    var x = cursor.x;
    var y = cursor.y;
    context.fillStyle = 'white';
    context.fillRect(x * 10, y * 10, 10, 10);
    renderAllWhite();
}
