let correctAnswer;
let timer;
let timeLeft;
let currentRoomCode = "";
let playerName = "";

let totalBenar = 0;
let totalSalah = 0;
let totalMain = 0;
let currentSettings = {};
let myCurrentOverride = null; 
let autoNextTimer;

function joinRoom() {
    playerName = document.getElementById('playerName').value.trim();
    currentRoomCode = document.getElementById('roomCode').value.trim().toUpperCase();
    const statusText = document.getElementById('lobbyStatus');

    if (playerName === "" || currentRoomCode === "") {
        statusText.innerText = "Nama dan Kode Ruangan wajib diisi!";
        statusText.style.color = "#e74c3c";
        return;
    }

    statusText.style.color = "#3498db";
    statusText.innerText = "Menghubungkan ke server...";

    database.ref('ruangan/' + currentRoomCode).once('value', (snapshot) => {
        if (snapshot.exists()) {
            database.ref('ruangan/' + currentRoomCode + '/pemain/' + playerName).set({
                status_jawaban: "Menunggu...",
                jawaban_murid: "",
                total_benar: 0,
                total_salah: 0,
                total_main: 0
            }).then(() => {
                sessionStorage.setItem('playerName', playerName);
                sessionStorage.setItem('roomCode', currentRoomCode);
                
                document.getElementById('lobbyContainer').style.display = 'none';
                document.getElementById('gameContainer').style.display = 'block';
                
                const mainBtn = document.getElementById('mainBtn');
                mainBtn.innerText = "Menunggu...";
                mainBtn.disabled = true;
                mainBtn.style.backgroundColor = "#7f8c8d";
                mainBtn.style.borderColor = "#7f8c8d";

                listenForStartSignal();
                listenToMyData();
            });
        } else {
            statusText.style.color = "#e74c3c";
            statusText.innerText = "Kode ruangan salah atau tidak ditemukan!";
        }
    });
}

function listenForStartSignal() {
    database.ref('ruangan/' + currentRoomCode).on('value', (snapshot) => {
        if (!snapshot.exists()) {
            sessionStorage.clear();
            alert("Ruangan telah ditutup! Anda dikembalikan ke halaman utama.");
            window.location.reload();
            return;
        }

        const roomData = snapshot.val();
        const myData = roomData.pemain ? roomData.pemain[playerName] : null;

        const settingsBox = document.querySelector('.settings');
        if (settingsBox) settingsBox.style.display = 'block';

        const globalSet = roomData.global_settings || { pakai_start: true };
        currentSettings = globalSet; 
        const myOverride = myData && myData.override ? myData.override : null;
        myCurrentOverride = myOverride; 

        const elMin = document.getElementById('minRange');
        const elMax = document.getElementById('maxRange');
        const elTime = document.getElementById('timeSetting');

        if(elMin) elMin.disabled = false;
        if(elMax) elMax.disabled = false;
        if(elTime) elTime.disabled = false;

        if (globalSet.useMin && elMin) { elMin.value = globalSet.min; elMin.disabled = true; }
        if (globalSet.useMax && elMax) { elMax.value = globalSet.max; elMax.disabled = true; }
        if (globalSet.useTime && elTime) { elTime.value = globalSet.waktu; elTime.disabled = true; }

        if (myOverride) {
            if(myOverride.min !== "" && elMin) { elMin.value = myOverride.min; elMin.disabled = true; }
            if(myOverride.max !== "" && elMax) { elMax.value = myOverride.max; elMax.disabled = true; }
            if(myOverride.waktu !== "" && elTime) { elTime.value = myOverride.waktu; elTime.disabled = true; }
        }

        const mainBtn = document.getElementById('mainBtn');
        
        if (roomData.status_game === "mulai") {
            if(elMin) elMin.disabled = true;
            if(elMax) elMax.disabled = true;
            if(elTime) elTime.disabled = true;

            if (globalSet.pakai_start) {
                mainBtn.style.display = 'block';
                if (mainBtn.innerText === "Menunggu...") {
                    mainBtn.innerText = "Start";
                    mainBtn.disabled = false;
                    mainBtn.onclick = startGame;
                    mainBtn.style.backgroundColor = "#3498db";
                    mainBtn.style.borderColor = "#3498db";
                }
            } else {
                mainBtn.style.display = 'none'; 
                if (totalMain === 0 && !timer && !autoNextTimer) startGame(); 
            }
        } else {
            clearInterval(timer);
            clearInterval(autoNextTimer);
            sessionStorage.removeItem('endTime');
            const input = document.getElementById('answerInput');
            if (input) input.disabled = true;
            
            mainBtn.style.display = 'block';
            mainBtn.innerText = "Menunggu...";
            mainBtn.disabled = true;
            mainBtn.style.backgroundColor = "#7f8c8d";
            mainBtn.style.borderColor = "#7f8c8d";
            
            database.ref('ruangan/' + currentRoomCode + '/pemain/' + playerName).update({
                status_jawaban: "Menunggu..."
            });
        }
    });
}

function listenToMyData() {
    database.ref('ruangan/' + currentRoomCode + '/pemain/' + playerName).on('value', (snapshot) => {
        if (snapshot.exists()) {
            const data = snapshot.val();
            totalBenar = data.total_benar || 0;
            totalSalah = data.total_salah || 0;
            totalMain = data.total_main || 0;
        }
    });
}

function startGame() {
    const input = document.getElementById('answerInput');
    const status = document.getElementById('statusText');

    let maxSoalLimit = 999999;
    if (currentSettings.useSoal || !currentSettings.pakai_start) {
        maxSoalLimit = parseInt(currentSettings.max_soal) || 10;
    }
    
    if (myCurrentOverride && myCurrentOverride.max_soal) {
        maxSoalLimit = parseInt(myCurrentOverride.max_soal);
    }

    if (totalMain >= maxSoalLimit) {
        document.getElementById('questionText').innerText = "Selesai!";
        document.getElementById('timeLeft').innerText = "0";
        status.innerText = `Kamu telah menyelesaikan ${totalMain} soal.`;
        input.disabled = true;
        const mainBtn = document.getElementById('mainBtn');
        mainBtn.style.display = 'block';
        mainBtn.disabled = true;
        mainBtn.innerText = "Selesai";
        return; 
    }

    const min = parseInt(document.getElementById('minRange').value) || -10;
    const max = parseInt(document.getElementById('maxRange').value) || 10;
    const setTime = parseInt(document.getElementById('timeSetting').value) || 5;
    
    input.value = '';
    input.className = '';
    input.disabled = false;
    input.focus();
    status.innerText = '';
    
    const mainBtn = document.getElementById('mainBtn');
    mainBtn.disabled = false;
    mainBtn.innerText = "Kirim Jawaban";
    mainBtn.onclick = submitAnswer;
    mainBtn.style.backgroundColor = "#2ecc71"; 
    mainBtn.style.borderColor = "#2ecc71";    

    if (currentRoomCode && playerName) {
        database.ref('ruangan/' + currentRoomCode + '/pemain/' + playerName).update({
            status_jawaban: "Sedang Mengerjakan",
            jawaban: "",
            rentang_soal: `${min} s/d ${max}`,
            waktu_set: `${setTime} detik`
        });
    }

    const num1 = Math.floor(Math.random() * (max - min + 1)) + min;
    const num2 = Math.floor(Math.random() * (max - min + 1)) + min;
    const isPlus = Math.random() > 0.5;
    const operator = isPlus ? '+' : '-';
    
    correctAnswer = isPlus ? num1 + num2 : num1 - num2;
    let displayNum2 = num2 < 0 ? `(${num2})` : num2;
    const questionText = `${num1} ${operator} ${displayNum2}`;
    document.getElementById('questionText').innerText = questionText;

    const endTime = Date.now() + (setTime * 1000); 
    sessionStorage.setItem('endTime', endTime);
    sessionStorage.setItem('qText', questionText);
    sessionStorage.setItem('qAnswer', correctAnswer);

    timeLeft = setTime;
    document.getElementById('timeLeft').innerText = timeLeft;
    
    clearInterval(timer);
    timer = setInterval(() => {
        timeLeft--;
        document.getElementById('timeLeft').innerText = timeLeft;
        if (timeLeft <= 0) {
            endByTimeout();
        }
    }, 1000);
}

function resumeGame(remainingTime) {
    const input = document.getElementById('answerInput');
    const status = document.getElementById('statusText');
    input.value = '';
    input.className = '';
    input.disabled = false;
    input.focus();
    status.innerText = '';

    const mainBtn = document.getElementById('mainBtn');
    mainBtn.disabled = false;
    mainBtn.innerText = "Kirim Jawaban";
    mainBtn.onclick = submitAnswer;
    mainBtn.style.backgroundColor = "#2ecc71";
    mainBtn.style.borderColor = "#2ecc71";

    document.getElementById('questionText').innerText = sessionStorage.getItem('qText') || "Siap?";
    correctAnswer = parseInt(sessionStorage.getItem('qAnswer')) || 0;

    timeLeft = remainingTime;
    document.getElementById('timeLeft').innerText = timeLeft;

    clearInterval(timer);
    if (timeLeft > 0) {
        timer = setInterval(() => {
            timeLeft--;
            document.getElementById('timeLeft').innerText = timeLeft;
            if (timeLeft <= 0) {
                endByTimeout();
            }
        }, 1000);
    }
}

function checkAnswer() {
    clearInterval(timer);
    
    sessionStorage.removeItem('endTime');
    sessionStorage.removeItem('qText');
    sessionStorage.removeItem('qAnswer');

    const input = document.getElementById('answerInput');
    const userAnswer = parseInt(input.value);
    const status = document.getElementById('statusText');

    input.disabled = true;
    let statusKirim = "";
    totalMain++; 
    
    if (userAnswer === correctAnswer) {
        totalBenar++; 
        input.classList.add('correct');
        status.innerText = "Benar!.";
        status.style.color = "#27ae60";
        statusKirim = "Benar";
    } else {
        totalSalah++; 
        input.classList.add('wrong');
        status.innerText = `Salah! Jawaban: ${correctAnswer}`;
        status.style.color = "#c0392b";
        statusKirim = "Salah";
    }

    if (currentRoomCode && playerName) {
        database.ref('ruangan/' + currentRoomCode + '/pemain/' + playerName).update({
            status_jawaban: statusKirim,
            jawaban: isNaN(userAnswer) ? "-" : userAnswer,
            total_benar: totalBenar,
            total_salah: totalSalah,
            total_main: totalMain
        });
    }

    if (!currentSettings.pakai_start) {
        let prepTime = currentSettings.jeda !== undefined ? parseInt(currentSettings.jeda) : 3;
        status.innerHTML += `<br><span style="color:#f39c12; font-size:0.9em;">Soal berikutnya dalam ${prepTime}...</span>`;
        
        clearInterval(autoNextTimer);
        autoNextTimer = setInterval(() => {
            prepTime--;
            if (prepTime > 0) {
                status.innerHTML = status.innerHTML.replace(/Soal berikutnya dalam \d+/, `Soal berikutnya dalam ${prepTime}`);
            } else {
                clearInterval(autoNextTimer);
                startGame();
            }
        }, 1000);
    } else {
        const mainBtn = document.getElementById('mainBtn');
        mainBtn.style.display = 'block';
        mainBtn.innerText = "Start";
        mainBtn.onclick = startGame;
        mainBtn.style.backgroundColor = "#3498db"; 
        mainBtn.style.borderColor = "#3498db";    
    }
}

function endByTimeout() {
    clearInterval(timer);
    
    sessionStorage.removeItem('endTime');
    sessionStorage.removeItem('qText');
    sessionStorage.removeItem('qAnswer');

    const input = document.getElementById('answerInput');
    
    if (input.value !== "") {
        checkAnswer(); 
    } else {
        const status = document.getElementById('statusText');
        input.disabled = true;
        input.classList.add('wrong');
        status.innerText = `Waktu Habis! Jawaban: ${correctAnswer}`;
        status.style.color = "#c0392b";

        totalMain++;
        totalSalah++;

        if (currentRoomCode && playerName) {
            database.ref('ruangan/' + currentRoomCode + '/pemain/' + playerName).update({
                status_jawaban: "Waktu Habis",
                jawaban: "Tidak Menjawab",
                total_benar: totalBenar,
                total_salah: totalSalah,
                total_main: totalMain
            });
        }

        if (!currentSettings.pakai_start) {
            let prepTime = currentSettings.jeda !== undefined ? parseInt(currentSettings.jeda) : 3; 
            status.innerHTML += `<br><span style="color:#f39c12; font-size:0.9em;">Soal berikutnya dalam ${prepTime}...</span>`;
            
            clearInterval(autoNextTimer);
            autoNextTimer = setInterval(() => {
                prepTime--;
                if (prepTime > 0) {
                    status.innerHTML = status.innerHTML.replace(/Soal berikutnya dalam \d+/, `Soal berikutnya dalam ${prepTime}`);
                } else {
                    clearInterval(autoNextTimer);
                    startGame();
                }
            }, 1000);
        } else {
            const mainBtn = document.getElementById('mainBtn');
            mainBtn.style.display = 'block';
            mainBtn.innerText = "Start";
            mainBtn.onclick = startGame;
            mainBtn.style.backgroundColor = "#3498db"; 
            mainBtn.style.borderColor = "#3498db";     
        }    
    }
}

function handleEnter(event) {
    if (event.key === "Enter" && document.getElementById('answerInput').value !== "") {
        checkAnswer();
    }
}
function appendNum(num) {
    const input = document.getElementById('answerInput');
    if (!input.disabled) {
        if (num === '-' && input.value !== '') return;
        input.value += num;
    }
}
function deleteNum() {
    const input = document.getElementById('answerInput');
    if (!input.disabled) {
        input.value = input.value.slice(0, -1);
    }
}
function submitAnswer() {
    if (document.getElementById('answerInput').value !== "") {
        checkAnswer();
    }
}
function toggleFullscreen() {
    if (!document.fullscreenElement) {
        document.documentElement.requestFullscreen().catch(err => {});
    } else {
        if (document.exitFullscreen) {
            document.exitFullscreen();
        }
    }
}
document.addEventListener('fullscreenchange', () => {
    const fsBtn = document.getElementById('fullscreenBtn');
    if (document.fullscreenElement) {
        fsBtn.innerText = "✖ Keluar Fullscreen";
        fsBtn.style.backgroundColor = "#e74c3c"; 
    } else {
        fsBtn.innerText = "⛶ Fullscreen";
        fsBtn.style.backgroundColor = "#2c3e50"; 
    }
});

window.onload = () => {
    const savedName = sessionStorage.getItem('playerName');
    const savedRoom = sessionStorage.getItem('roomCode');
    
    if (savedName && savedRoom) {
        database.ref('ruangan/' + savedRoom).once('value', (snapshot) => {
            if (snapshot.exists()) {
                playerName = savedName;
                currentRoomCode = savedRoom;
                
                const playerData = snapshot.child('pemain/' + playerName).val();
                if (playerData) {
                    totalBenar = playerData.total_benar || 0;
                    totalSalah = playerData.total_salah || 0;
                    totalMain = playerData.total_main || 0;
                }
                
                document.getElementById('lobbyContainer').style.display = 'none';
                document.getElementById('gameContainer').style.display = 'block';
                
                const roomStatus = snapshot.child('status_game').val();
                if (roomStatus === "mulai") {
                    const savedEndTime = sessionStorage.getItem('endTime');
                    if (savedEndTime) {
                        const now = Date.now();
                        const remaining = Math.floor((savedEndTime - now) / 1000);
                        
                        if (remaining > 0) {
                            resumeGame(remaining);
                            database.ref('ruangan/' + currentRoomCode + '/pemain/' + playerName).update({
                                status_jawaban: "Sedang Mengerjakan"
                            });
                        } else {
                            resumeGame(0);
                            endByTimeout();
                        }
                    } else {
                        const mainBtn = document.getElementById('mainBtn');
                        mainBtn.innerText = "Start";
                        mainBtn.disabled = false;
                        mainBtn.onclick = startGame;
                        mainBtn.style.backgroundColor = "#3498db";
                        mainBtn.style.borderColor = "#3498db";
                    }
                } else {
                    const mainBtn = document.getElementById('mainBtn');
                    mainBtn.innerText = "Menunggu...";
                    mainBtn.disabled = true;
                    mainBtn.style.backgroundColor = "#7f8c8d";
                    mainBtn.style.borderColor = "#7f8c8d";
                }
                
                listenForStartSignal();
                listenToMyData();
            } else {
                sessionStorage.clear();
            }
        });
    }
};