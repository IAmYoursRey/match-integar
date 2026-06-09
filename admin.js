let currentRoomCode = "";

// Fungsi membuat kode acak 4 digit angka (Contoh: 7412)
function generateRandomCode() {
    return Math.floor(1000 + Math.random() * 9000).toString();
}

// Fungsi membuat pangkalan data ruangan baru di Firebase
function createRoom() {
    currentRoomCode = generateRandomCode();
    
    // Set data awal ruangan di database internet Firebase
    database.ref('ruangan/' + currentRoomCode).set({
        status_game: "tunggu", // status 'tunggu' membuat murid tertahan di lobby
        soal_aktif: ""
    }).then(() => {
        // Ganti tampilan tombol menjadi dashboard pantauan guru
        document.getElementById('setupSection').style.display = 'none';
        document.getElementById('roomSection').style.display = 'block';
        document.getElementById('displayRoomCode').innerText = currentRoomCode;
        
        // Mulai mendengarkan server jika ada murid yang masuk atau menjawab
        listenToPlayers();
    }).catch((error) => {
        alert("Gagal membuat ruangan di server: " + error.message);
    });
}

// Fungsi memantau pergerakan murid secara Real-Time (Tanpa Refresh)
function listenToPlayers() {
    database.ref('ruangan/' + currentRoomCode + '/pemain').on('value', (snapshot) => {
        const playerListContainer = document.getElementById('playerList');
        const playerCountSpan = document.getElementById('playerCount');
        playerListContainer.innerHTML = ""; // Bersihkan baris tabel lama
        
        if (snapshot.exists()) {
            const players = snapshot.val();
            let count = 0;
            
            // Membaca satu per satu nama murid yang masuk ke database
            for (let name in players) {
                count++;
                const playerData = players[name];
                
                let statusText = "Menunggu Aba-aba...";
                let rowStyle = "";
                
                // Pewarnaan dinamis baris tabel guru berdasarkan respon murid
                if (playerData.status_jawaban === "Benar") {
                    statusText = "Benar! ✔";
                    rowStyle = "background-color: #f0fff4; color: #27ae60; font-weight: bold;";
                } else if (playerData.status_jawaban === "Salah") {
                    statusText = `Salah (Jawab: ${playerData.jawaban_murid})`;
                    rowStyle = "background-color: #fff5f5; color: #c0392b; font-weight: bold;";
                } else if (playerData.status_jawaban === "Waktu Habis") {
                    statusText = "Waktu Habis! ⏰";
                    rowStyle = "background-color: #fff5f5; color: #c0392b; font-weight: bold;";
                } else if (playerData.status_jawaban === "Sedang Mengerjakan") {
                    statusText = "Sedang Berpikir... 📝";
                    rowStyle = "color: #3498db;";
                }
                
                // Tangkap data tambahan dari Firebase (atau beri nilai 0 jika belum ada)
                const rentang = playerData.rentang_soal || "-";
                const waktu = playerData.waktu_set || "-";
                const tBenar = playerData.total_benar || 0;
                const tSalah = playerData.total_salah || 0;
                const tMain = playerData.total_main || 0;
                
                // Tentukan warna latar baris dengan halus
                let bgRow = "#ffffff";
                let textStatusColor = "#3498db"; // Biru untuk default/mengerjakan

                if (playerData.status_jawaban === "Benar") {
                    bgRow = "#f0fff4"; // Hijau sangat tipis
                    textStatusColor = "#27ae60";
                } else if (playerData.status_jawaban === "Salah" || playerData.status_jawaban === "Waktu Habis") {
                    bgRow = "#fff5f5"; // Merah sangat tipis
                    textStatusColor = "#c0392b";
                }
                
                // Susunan HTML baris tabel yang jauh lebih padat dan rapi
                const row = `
                    <tr style="background-color: ${bgRow}; transition: background 0.3s;">
                        <td style="font-weight: bold; font-size: 1.05em;">${name}</td>
                        <td style="text-align: center; font-size: 0.85em; color: #7f8c8d; line-height: 1.4;">
                            R: <b>${rentang}</b><br>
                            W: <b>${waktu}</b>
                        </td>
                        <td style="text-align: center; line-height: 1.4;">
                            <span style="color:#27ae60; font-weight:bold;">✔ ${tBenar}</span> | 
                            <span style="color:#e74c3c; font-weight:bold;">✖ ${tSalah}</span><br>
                            <span style="font-size: 0.8em; color:#95a5a6; font-weight:bold;">Tot: ${tMain}</span>
                        </td>
                        <td style="text-align: center; font-weight: bold; color: ${textStatusColor};">
                            ${statusText}
                        </td>
                    </tr>
                `;
                playerListContainer.innerHTML += row;
            }
            playerCountSpan.innerText = count;
        } else {
            playerCountSpan.innerText = "0";
            playerListContainer.innerHTML = `<tr><td colspan="2" style="text-align:center; padding:20px; color:#95a5a6;">Belum ada murid yang bergabung...</td></tr>`;
        }
    });
}

// Fungsi saat Guru menekan tombol "Mulai Ujian Semua Murid"
function startQuiz() {
    database.ref('ruangan/' + currentRoomCode).update({
        status_game: "mulai" // Berubah jadi mulai, memicu layar HP murid berganti ke soal
    }).then(() => {
        const startBtn = document.getElementById('startQuizBtn');
        startBtn.innerText = "Ujian Sedang Berjalan...";
        startBtn.disabled = true;
        startBtn.style.backgroundColor = "#7f8c8d";
        startBtn.style.borderColor = "#7f8c8d";
    });
}