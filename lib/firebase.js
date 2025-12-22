// Configuración mínima Firebase para Idefix (rellena con tus datos)
import { initializeApp } from "https://www.gstatic.com/firebasejs/9.22.2/firebase-app.js";
import { getAuth, GoogleAuthProvider, signInWithPopup, signOut, createUserWithEmailAndPassword, signInWithEmailAndPassword  } from "https://www.gstatic.com/firebasejs/9.22.2/firebase-auth.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/9.22.2/firebase-firestore.js";

const firebaseConfig = {
    apiKey: "AIzaSyC995KuGbvInjtD0q3jPUhOh8xyMKpOBHs",
    authDomain: "idefix-c693b.firebaseapp.com",
    projectId: "idefix-c693b",
    storageBucket: "idefix-c693b.firebasestorage.app",
    messagingSenderId: "683348714156",
    appId: "1:683348714156:web:6b4e2579991f051d447509"
  };

export const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const provider = new GoogleAuthProvider();
export const db = getFirestore(app);



