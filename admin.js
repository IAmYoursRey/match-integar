let currentRoomCode = "";
let isQuizRunning = false;

function generateRandomCode() {
    return Math.floor(1000 + Math.random() * 9000).toString();
}

function createRoom() {
    currentRoomCode = generateRandomCode();
    database.ref('ruangan/' + currentRoomCode).set({
        status_game: "tunggu",
        soal_aktif: ""
    }).then(() => {
        document.getElementById('setupSection').style.display = 'none';
        document.getElementById('roomSection').style.display = 'block';
        document.getElementById('displayRoomCode').innerText = currentRoomCode;
        sessionStorage.setItem('adminRoomCode', currentRoomCode);
        listenToPlayers();
    }).catch((error) => {
        alert("Gagal membuat ruangan di server: " + error.message);
    });
}

function listenToPlayers() {
    database.ref('ruangan/' + currentRoomCode + '/pemain').on('value', (snapshot) => {
        const listScore = document.getElementById('playerListScore');
        const listIndiv = document.getElementById('playerListIndiv');
        const countScore = document.getElementById('playerCountScore');
        const countIndiv = document.getElementById('playerCountIndiv');
        
        listScore.innerHTML = ""; 
        listIndiv.innerHTML = "";
        
        if (snapshot.exists()) {
            const players = snapshot.val();
            let count = 0;
            
            for (let name in players) {
                count++;
                const playerData = players[name];
                
                // Ambil laporan pengaturan aktual dari layar murid
                const rentangAktif = playerData.rentang_soal || "Belum Mulai";
                const waktuAktif = playerData.waktu_set || "-";
                
                // --- PROSES DATA UNTUK TABEL SKOR (TAB 1) ---
                let statusText = "Menunggu...";
                let textStatusColor = "#3498db"; 
                let bgRowScore = "#ffffff";
                
                if (playerData.status_jawaban === "Benar") {
                    statusText = "Benar! ✔";
                    bgRowScore = "#f0fff4"; 
                    textStatusColor = "#27ae60";
                } else if (playerData.status_jawaban === "Salah") {
                    statusText = `Salah (Jawab: ${playerData.jawaban_murid})`;
                    bgRowScore = "#fff5f5"; 
                    textStatusColor = "#c0392b";
                } else if (playerData.status_jawaban === "Waktu Habis") {
                    statusText = "Waktu Habis! ⏰";
                    bgRowScore = "#fff5f5"; 
                    textStatusColor = "#c0392b";
                } else if (playerData.status_jawaban === "Mengerjakan") {
                    statusText = "Berpikir... 📝";
                }
                
                const tBenar = playerData.total_benar || 0;
                const tSalah = playerData.total_salah || 0;
                const tMain = playerData.total_main || 0;
                
                const rowScore = `
                    <tr style="border-bottom: 1px solid #f1f2f6; transition: background 0.3s; background-color: ${bgRowScore};">
                        <td style="font-weight: bold; font-size: 1.05em; padding:12px 10px;">${name}</td>
                        <td style="text-align: center; line-height: 1.4; padding:12px 10px; font-size: 0.85em; color: #7f8c8d;">
                            <b>R:</b> ${rentangAktif}<br>
                            <b>W:</b> ${waktuAktif}
                        </td>
                        <td style="text-align: center; line-height: 1.4; padding:12px 10px;">
                            <span style="color:#27ae60; font-weight:bold;">✔ ${tBenar}</span> | <span style="color:#e74c3c; font-weight:bold;">✖ ${tSalah}</span><br>
                            <span style="font-size: 0.8em; color:#95a5a6; font-weight:bold;">Tot: ${tMain}</span>
                        </td>
                        <td style="text-align: center; font-weight: bold; color: ${textStatusColor}; padding:12px 10px;">${statusText}</td>
                    </tr>
                `;
                listScore.innerHTML += rowScore;

                // --- PROSES DATA UNTUK TABEL INDIVIDU (TAB 2) ---
                let aturanAdmin = "<span style='color:#95a5a6; font-size:0.85em;'>Tidak ada<br>(Ikut Global)</span>";
                let bgRowIndiv = "#ffffff";
                
                if (playerData.override) {
                    bgRowIndiv = "#fff3cd"; // Latar kuning jika murid ini punya aturan khusus
                    const o = playerData.override;
                    aturanAdmin = `<span style='color:#d35400; font-size:0.85em; font-weight:bold;'>Aktif:</span><br>
                                  <span style='font-size:0.8em; color:#2c3e50; font-weight:bold;'>R: ${o.min||'-'} s/d ${o.max||'-'}<br>W: ${o.waktu||'-'}s | M: ${o.max_soal||'-'}</span>`;
                }

                const rowIndiv = `
                    <tr style="border-bottom: 1px solid #f1f2f6; background-color: ${bgRowIndiv};">
                        <td style="font-weight: bold; font-size: 1.05em; padding:12px 10px;">${name}</td>
                        <td style="text-align: center; line-height: 1.4; padding:12px 10px; font-size: 0.85em; color: #7f8c8d;">
                            <b>R:</b> ${rentangAktif}<br>
                            <b>W:</b> ${waktuAktif}
                        </td>
                        <td style="text-align: center; line-height: 1.3; padding:12px 10px;">${aturanAdmin}</td>
                        <td style="text-align: center; padding:12px 10px;">
                            <button onclick="setIndividual('${name}')" style="background:#3498db; color:white; border:none; padding:8px 15px; border-radius:5px; cursor:pointer; font-weight:bold;">⚙️ Atur</button>
                        </td>
                    </tr>
                `;
                listIndiv.innerHTML += rowIndiv;
            }
            countScore.innerText = count;
            countIndiv.innerText = count;
        } else {
            countScore.innerText = "0";
            countIndiv.innerText = "0";
            listScore.innerHTML = `<tr><td colspan="4" style="text-align:center; padding:30px; color:#95a5a6;">Belum ada murid yang bergabung...</td></tr>`;
            listIndiv.innerHTML = `<tr><td colspan="4" style="text-align:center; padding:30px; color:#95a5a6;">Belum ada murid yang bergabung...</td></tr>`;
        }
    });
}

function deleteRoom() {
    if (confirm("Apakah Anda yakin ingin menghapus ruangan ini? Semua murid akan dikeluarkan secara otomatis.")) {
        database.ref('ruangan/' + currentRoomCode).remove().then(() => {
            sessionStorage.removeItem('adminRoomCode');
            document.getElementById('setupSection').style.display = 'block';
            document.getElementById('roomSection').style.display = 'none';
            currentRoomCode = "";
            
            // Bersihkan dua tabel sekaligus (pakai colspan 4 karena sekarang ada 4 kolom)
            document.getElementById('playerListScore').innerHTML = `<tr><td colspan="4" style="text-align:center; padding:30px; color:#95a5a6;">Belum ada murid yang bergabung...</td></tr>`;
            document.getElementById('playerListIndiv').innerHTML = `<tr><td colspan="4" style="text-align:center; padding:30px; color:#95a5a6;">Belum ada murid yang bergabung...</td></tr>`;
            document.getElementById('playerCountScore').innerText = "0";
            document.getElementById('playerCountIndiv').innerText = "0";
            
            // Matikan tombol jika ujian sedang jalan
            if (isQuizRunning) toggleQuiz();
        });
    }
}

window.onload = () => {
    const savedRoom = sessionStorage.getItem('adminRoomCode');
    if (savedRoom) {
        currentRoomCode = savedRoom;
        document.getElementById('setupSection').style.display = 'none';
        document.getElementById('roomSection').style.display = 'block';
        document.getElementById('displayRoomCode').innerText = currentRoomCode;
        listenToPlayers();
        database.ref('ruangan/' + currentRoomCode + '/status_game').once('value', (snapshot) => {
            if (snapshot.val() === "mulai") {
                isQuizRunning = true;
                updateToggleBtnUI();
            }
        });
    }
};

function toggleQuiz() {
    isQuizRunning = !isQuizRunning;
    const newStatus = isQuizRunning ? "mulai" : "tunggu";
    database.ref('ruangan/' + currentRoomCode).update({ status_game: newStatus }).then(() => {
        updateToggleBtnUI();
    });
}

function updateToggleBtnUI() {
    const btn = document.getElementById('toggleQuizBtn');
    if (isQuizRunning) {
        btn.innerHTML = "🛑 Stop";
        btn.className = "admin-btn btn-warning"; // Berubah warna oranye halus
    } else {
        btn.innerHTML = "▶ Mulai";
        btn.className = "admin-btn btn-success"; // Berubah hijau segar
    }
}

function resetScores() {
    if (confirm("Yakin ingin mereset semua poin murid menjadi 0? (Nama murid tidak akan dihapus)")) {
        database.ref('ruangan/' + currentRoomCode + '/pemain').once('value', (snapshot) => {
            if (snapshot.exists()) {
                const updates = {};
                snapshot.forEach((child) => {
                    const playerName = child.key;
                    updates[playerName + '/total_benar'] = 0;
                    updates[playerName + '/total_salah'] = 0;
                    updates[playerName + '/total_main'] = 0;
                    updates[playerName + '/status_jawaban'] = "Menunggu...";
                    updates[playerName + '/jawaban_murid'] = "";
                });
                database.ref('ruangan/' + currentRoomCode + '/pemain').update(updates);
            }
        });
    }
}

function switchTab(tabNum) {
    document.getElementById('tab1').style.display = tabNum === 1 ? 'block' : 'none';
    document.getElementById('tab2').style.display = tabNum === 2 ? 'block' : 'none';
    
    if (tabNum === 1) {
        document.getElementById('tab1Btn').classList.add('active');
        document.getElementById('tab2Btn').classList.remove('active');
    } else {
        document.getElementById('tab2Btn').classList.add('active');
        document.getElementById('tab1Btn').classList.remove('active');
    }
}

// Memaksa Maksimal Soal nyala jika Tombol Start dimatikan
function toggleStartBtnLogic() {
    const pakaiStart = document.getElementById('gCheckStart').checked;
    const jedaBox = document.getElementById('jedaContainer');
    const checkSoal = document.getElementById('gCheckSoal');
    
    if (!pakaiStart) {
        jedaBox.style.display = 'block';
        checkSoal.checked = true; // Paksa centang
        checkSoal.disabled = true; // Kunci agar guru tidak bisa un-check
    } else {
        jedaBox.style.display = 'none';
        checkSoal.disabled = false; // Buka kunci
    }
    updateGlobalSettings();
}

// Kirim data ke Firebase (Termasuk Jeda)
function updateGlobalSettings() {
    database.ref('ruangan/' + currentRoomCode + '/global_settings').set({
        useMin: document.getElementById('gCheckMin').checked,
        min: document.getElementById('gMin').value,
        useMax: document.getElementById('gCheckMax').checked,
        max: document.getElementById('gMax').value,
        useTime: document.getElementById('gCheckTime').checked,
        waktu: document.getElementById('gTime').value,
        useSoal: document.getElementById('gCheckSoal').checked || !document.getElementById('gCheckStart').checked, // Wajib true jika start mati
        max_soal: document.getElementById('gMaxSoal').value,
        pakai_start: document.getElementById('gCheckStart').checked,
        jeda: document.getElementById('gJeda').value
    });
}

// --- LOGIKA MENU POPUP INDIVIDU ---
let currentEditingPlayer = "";

function setIndividual(nama) {
    currentEditingPlayer = nama;
    document.getElementById('modalTitle').innerText = "Pengaturan: " + nama;
    
    // Ambil data lama jika ada
    database.ref('ruangan/' + currentRoomCode + '/pemain/' + nama + '/override').once('value', snap => {
        if(snap.exists()) {
            const data = snap.val();
            document.getElementById('iMin').value = data.min || "";
            document.getElementById('iMax').value = data.max || "";
            document.getElementById('iTime').value = data.waktu || "";
            document.getElementById('iMaxSoal').value = data.max_soal || "";
        } else {
            document.getElementById('iMin').value = "";
            document.getElementById('iMax').value = "";
            document.getElementById('iTime').value = "";
            document.getElementById('iMaxSoal').value = "";
        }
        document.getElementById('indivModal').style.display = 'flex';
    });
}

function closeModal() {
    document.getElementById('indivModal').style.display = 'none';
}

function saveIndividual() {
    database.ref('ruangan/' + currentRoomCode + '/pemain/' + currentEditingPlayer + '/override').set({
        min: document.getElementById('iMin').value,
        max: document.getElementById('iMax').value,
        waktu: document.getElementById('iTime').value,
        max_soal: document.getElementById('iMaxSoal').value
    }).then(() => {
        closeModal();
    });
}

function clearIndividual() {
    database.ref('ruangan/' + currentRoomCode + '/pemain/' + currentEditingPlayer + '/override').remove().then(() => {
        closeModal();
    });
}

function clearAllIndividuals() {
    if(confirm("Hapus semua kunci pengaturan individu? Semua murid akan kembali mengikuti aturan Global.")) {
        database.ref('ruangan/' + currentRoomCode + '/pemain').once('value', snapshot => {
            snapshot.forEach(child => child.ref.child('override').remove());
        });
    }
}