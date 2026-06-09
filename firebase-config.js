const firebaseConfig = {
    apiKey: "AIzaSyB7U3CWAbMjVCzykWqZGTh2AdyNWbX1waQ",
    authDomain: "match-integar.firebaseapp.com",
    projectId: "match-integar",
    storageBucket: "match-integar.firebasestorage.app",
    messagingSenderId: "48115524564",
    appId: "1:48115524564:web:f2ad65ede45ab1edbbec41",
    measurementId: "G-WYH2ZNNSNW",
    
    databaseURL: "https://match-integar-default-rtdb.asia-southeast1.firebasedatabase.app"
};

firebase.initializeApp(firebaseConfig);
const database = firebase.database();