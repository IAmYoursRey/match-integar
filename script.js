// =======================================================
// --- PENGATURAN UJIAN GURU (Silakan Ubah di Sini) ---
// =======================================================
const CONFIG_MIN = -10;    // Angka paling kecil untuk soal acak
const CONFIG_MAX = 10;     // Angka paling besar untuk soal acak
const CONFIG_TIME = 5;     // Batas waktu pengerjaan per soal (detik)
// =======================================================

let correctAnswer;
let timer;
let timeLeft;
let currentRoomCode = "";
let playerName = "";
let totalBenar = 0;
let totalSalah = 0;
let totalMain = 0;

// --- FUNGSI GABUNG RUANGAN (LOBBY) ---
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
    statusText.innerText = "Menghubungkan ke server kuis...";

    // Memeriksa ke server Firebase apakah kode ruangan dari guru aktif
    database.ref('ruangan/' + currentRoomCode).once('value', (snapshot) => {
        if (snapshot.exists()) {
            // Daftarkan nama murid ke dalam server ruangan tersebut
            database.ref('ruangan/' + currentRoomCode + '/pemain/' + playerName).set({
                status_jawaban: "Sedang Menunggu...",
                jawaban_murid: ""
            }).then(() => {
                statusText.style.color = "#2ecc71";
                statusText.innerText = "Berhasil bergabung! Mohon tunggu instruksi Guru untuk mulai...";
                statusText.innerText = "Berhasil bergabung! Mohon tunggu instruksi Guru untuk mulai...";
                
                // SIMPAN SESI LOGIN (Tambahkan 2 baris ini)
                sessionStorage.setItem('playerName', playerName);
                sessionStorage.setItem('roomCode', currentRoomCode);
                // Kunci tombol agar tidak ditekan berulang kali
                document.querySelector('#lobbyContainer button').disabled = true;

                // Mulai mendengarkan tanda "Mulai" dari laptop Guru
                listenForStartSignal();
            });
        } else {
            statusText.style.color = "#e74c3c";
            statusText.innerText = "Kode ruangan salah atau tidak ditemukan!";
        }
    });
}

// Mendengarkan aba-aba mulai dari server secara real-time
// Mendengarkan aba-aba dari server secara real-time
function listenForStartSignal() {
    database.ref('ruangan/' + currentRoomCode + '/status_game').on('value', (snapshot) => {
        // Jika data hilang (ruangan dihapus oleh Guru)
        if (!snapshot.exists()) {
            sessionStorage.clear(); // Hapus memori murid
            alert("Ruangan telah ditutup oleh Guru! Anda akan dikembalikan ke halaman utama.");
            window.location.reload(); // Paksa muat ulang halaman ke layar masuk
            return;
        }

        if (snapshot.val() === "mulai") {
            // Sembunyikan kotak login, munculkan dashboard game utama
            document.getElementById('lobbyContainer').style.display = 'none';
            document.getElementById('gameContainer').style.display = 'block';
            startGame();
        }
    });
}

// --- FUNGSI UTAMA PERMAINAN MULA/LANJUT ---
function startGame() {
    // Membaca konfigurasi tetap yang sudah dikunci oleh guru di atas
    const min = CONFIG_MIN;
    const max = CONFIG_MAX;
    const setTime = CONFIG_TIME;
    
    const input = document.getElementById('answerInput');
    const status = document.getElementById('statusText');
    input.value = '';
    input.className = '';
    input.disabled = false;
    input.focus();
    status.innerText = '';
    
    const mainBtn = document.getElementById('mainBtn');
    mainBtn.innerText = "Kirim Jawaban";
    mainBtn.onclick = submitAnswer;
    mainBtn.style.backgroundColor = "#2ecc71"; 
    mainBtn.style.borderColor = "#2ecc71";    

    if (currentRoomCode && playerName) {
        // Ambil nilai pengaturan di layar murid (pakai proteksi jika kotak dihapus)
        const curMin = document.getElementById('minRange') ? document.getElementById('minRange').value : "-";
        const curMax = document.getElementById('maxRange') ? document.getElementById('maxRange').value : "-";
        const curTime = document.getElementById('timeSetting') ? document.getElementById('timeSetting').value : "-";

        database.ref('ruangan/' + currentRoomCode + '/pemain/' + playerName).update({
            status_jawaban: "Sedang Mengerjakan",
            jawaban_murid: "",
            rentang_soal: `${curMin} s/d ${curMax}`,
            waktu_set: `${curTime} detik`
        });
    }

    // Pembuatan angka acak matematika bilangan bulat
    const num1 = Math.floor(Math.random() * (max - min + 1)) + min;
    const num2 = Math.floor(Math.random() * (max - min + 1)) + min;
    const isPlus = Math.random() > 0.5;
    const operator = isPlus ? '+' : '-';
    
    correctAnswer = isPlus ? num1 + num2 : num1 - num2;
    
    let displayNum2 = num2 < 0 ? `(${num2})` : num2;
    document.getElementById('questionText').innerText = `${num1} ${operator} ${displayNum2}`;

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

// --- FUNGSI PERIKSA JAWABAN ---
function checkAnswer() {
    clearInterval(timer);
    const input = document.getElementById('answerInput');
    const userAnswer = parseInt(input.value);
    const status = document.getElementById('statusText');

    input.disabled = true;

    let statusKirim = "";
    totalMain++; // Tambah total soal dimainkan
    
    if (userAnswer === correctAnswer) {
        totalBenar++; // Tambah poin benar
        input.classList.add('correct');
        status.innerText = "Benar! Bagus Sekali.";
        status.style.color = "#27ae60";
        statusKirim = "Benar";
    } else {
        totalSalah++; // Tambah poin salah
        input.classList.add('wrong');
        status.innerText = `Salah! Jawaban: ${correctAnswer}`;
        status.style.color = "#c0392b";
        statusKirim = "Salah";
    }

    // Laporkan jawaban & statistik ke panel guru
    if (currentRoomCode && playerName) {
        database.ref('ruangan/' + currentRoomCode + '/pemain/' + playerName).update({
            status_jawaban: statusKirim,
            jawaban_murid: isNaN(userAnswer) ? "-" : userAnswer,
            total_benar: totalBenar,
            total_salah: totalSalah,
            total_main: totalMain
        });
    }

    // Laporkan jawaban ke panel guru secara langsung
    if (currentRoomCode && playerName) {
        database.ref('ruangan/' + currentRoomCode + '/pemain/' + playerName).update({
            status_jawaban: statusKirim,
            jawaban_murid: isNaN(userAnswer) ? "-" : userAnswer
        });
    }

    const mainBtn = document.getElementById('mainBtn');
    mainBtn.innerText = "Start";
    mainBtn.onclick = startGame;
    mainBtn.style.backgroundColor = "#3498db"; 
    mainBtn.style.borderColor = "#3498db";    
}

// --- FUNGSI KONDISI WAKTU HABIS ---
function endByTimeout() {
    clearInterval(timer);
    const input = document.getElementById('answerInput');
    
    if (input.value !== "") {
        checkAnswer(); 
    } else {
        const status = document.getElementById('statusText');
        input.disabled = true;
        input.classList.add('wrong');
        status.innerText = `Waktu Habis! Jawaban: ${correctAnswer}`;
        status.style.color = "#c0392b";

        // Laporkan status waktu habis ke panel guru
        if (currentRoomCode && playerName) {
            database.ref('ruangan/' + currentRoomCode + '/pemain/' + playerName).update({
                status_jawaban: "Waktu Habis",
                jawaban_murid: "Tidak Menjawab"
            });
        }

        const mainBtn = document.getElementById('mainBtn');
        mainBtn.innerText = "Start";
        mainBtn.onclick = startGame;
        mainBtn.style.backgroundColor = "#3498db"; 
        mainBtn.style.borderColor = "#3498db";     
    }
}

// --- LOGIKA PERIPHERAL / PENDUKUNG (KALKULATOR & FULLSCREEN) ---
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
        document.documentElement.requestFullscreen().catch(err => {
            alert(`Gagal mengaktifkan mode fullscreen: ${err.message}`);
        });
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

// --- AUTO RECONNECT JIKA DI-REFRESH ---
window.onload = () => {
    const savedName = sessionStorage.getItem('playerName');
    const savedRoom = sessionStorage.getItem('roomCode');
    
    if (savedName && savedRoom) {
        // Cek dulu apakah ruangannya masih ada di server sebelum masuk
        database.ref('ruangan/' + savedRoom).once('value', (snapshot) => {
            if (snapshot.exists()) {
                playerName = savedName;
                currentRoomCode = savedRoom;
                
                document.getElementById('lobbyContainer').style.display = 'none';
                document.getElementById('gameContainer').style.display = 'block';
                
                database.ref('ruangan/' + currentRoomCode + '/pemain/' + playerName).update({
                    status_jawaban: "Terkoneksi kembali..."
                });
                
                listenForStartSignal();
            } else {
                // Jika ruangannya ternyata sudah dihapus guru, bersihkan memori murid
                sessionStorage.clear();
            }
        });
    }
};