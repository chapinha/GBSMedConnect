import { initializeApp } from "https://www.gstatic.com/firebasejs/12.19.0/firebase-app.js";

import {
    getFirestore
} from "https://www.gstatic.com/firebasejs/12.19.0/firebase-firestore.js";


const firebaseConfig = {
    apiKey: "AIzaSyBlYd29tTRL1KbHPVn8Fuo9zczIfcOjBtY",
    authDomain: "gbsmedconnect.firebaseapp.com",
    projectId: "gbsmedconnect",
    storageBucket: "gbsmedconnect.firebasestorage.app",
    messagingSenderId: "815516367098",
    appId: "1:815516367098:web:8cc31ca2d2871d695c7143",
    measurementId: "G-RWRYP142MM"
};


const app = initializeApp(firebaseConfig);

const db = getFirestore(app);


console.log("Firebase conectado com sucesso!");
console.log("Firestore conectado com sucesso!");


export {
    app,
    db
};