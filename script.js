// script.js para Idefix MVP (Firebase Auth & Firestore)

// FIREBASE IMPORT (v9 modular):
import { auth, provider, db } from './lib/firebase.js';
import {
    collection, addDoc, getDocs, query, where, doc, getDoc, setDoc, updateDoc, deleteDoc, orderBy, serverTimestamp, onSnapshot
} from "https://www.gstatic.com/firebasejs/9.22.2/firebase-firestore.js";
import {
    signInWithPopup, signOut, createUserWithEmailAndPassword, signInWithEmailAndPassword, onAuthStateChanged, updateProfile
} from "https://www.gstatic.com/firebasejs/9.22.2/firebase-auth.js";

// --- UTILIDADES GENERALES ---
const qs = sel => document.querySelector(sel);
const qsa = sel => document.querySelectorAll(sel);
const byId = id => document.getElementById(id);
function htmlEscape(str) {
    return str.replace(/[&<>"']/g, s => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;','\'':'&#39;'}[s]));
}

// --- VARIABLE DE USUARIO GLOBAL ---
let currentUser = null;

// --- AUTENTICACIÓN: LOGIN, LOGOUT, REGISTRO ---
if(location.pathname.endsWith('login.html')) {
    // Mostrar mensaje
    const loginMsg = byId('login-msg');
    const showMsg = m => loginMsg.innerText = m;

    // LOGIN EMAIL
    byId('login-form').onsubmit = async e => {
        e.preventDefault();
        showMsg('');
        try {
            await signInWithEmailAndPassword(auth, byId('login-email').value, byId('login-password').value);
            window.location = 'index.html';
        } catch(err) {
            showMsg('Error: ' + err.message);
        }
    };
    // LOGIN GOOGLE
    byId('google-login-btn').onclick = async e => {
        e.preventDefault();
        try {
            await signInWithPopup(auth, provider);
            window.location = 'index.html';
        } catch(err) {
            showMsg('Error: ' + err.message);
        }
    };
    // REGISTRO
    byId('register-form').onsubmit = async e => {
        e.preventDefault();
        showMsg('');
        try {
            const cred = await createUserWithEmailAndPassword(auth, byId('register-email').value, byId('register-password').value);
            await updateProfile(cred.user, { displayName: byId('register-name').value });
            // Registrar en Firestore
            await setDoc(doc(db, 'users', cred.user.uid), {
                nombre: byId('register-name').value,
                email: cred.user.email,
                foto: cred.user.photoURL || '',
            });
            window.location = 'index.html';
        } catch(err) {
            showMsg('Error: ' + err.message);
        }
    };
}

// --- PANEL PRINCIPAL Y OBJETIVOS ---
if(location.pathname.endsWith('index.html') || location.pathname === '/' || location.pathname === '') {

    // Renderizar usuario y logout
    onAuthStateChanged(auth, async user => {
        if (!user) {
            window.location = 'login.html';
            return;
        }
        currentUser = user;
        renderUserMenu();
        renderGoals();
    });

    function renderUserMenu() {
        const menu = byId('user-menu');
        let html = `<img src="${currentUser.photoURL||'assets/logo.png'}" class="logo" style="border-radius:50%;width:32px;height:32px;">`;
        html += `<span class="uname">${htmlEscape(currentUser.displayName || currentUser.email.split('@')[0])}</span>`;
        html += `<button id="logout-btn" class="main-btn alt">Salir</button>`;
        menu.innerHTML = html;
        byId('logout-btn').onclick = () => { signOut(auth); };
    }

    // --- OBJETIVOS CRUD LOGICA ---
    const goalsCol = collection(db, 'goals');
    const goalsList = byId('goals-list');
    let editingGoalId = null;
    let goals = [];
    let unsubscribe = null;

    function renderGoals() {
        if(unsubscribe) unsubscribe();
        unsubscribe = onSnapshot(query(goalsCol, where("usuario_id", "==", currentUser.uid)), snap => {
            goals = [];
            snap.forEach(doc => { goals.push({id: doc.id, ...doc.data()}); });
            goals.sort((a, b) => (b.prioridad||0) - (a.prioridad||0)); // futuro: soporte prioridad
            htmlGoalsList();
        });
    }
    function htmlGoalsList() {
        goalsList.innerHTML = '';
        if(!goals.length){ goalsList.innerHTML = '<p>Sin objetivos aún ¡Crea tu primero!</p>'; return; }
        goals.forEach(goal => {
            const el = document.createElement('div');
            el.className = 'goal-card';
            el.innerHTML = `
              <div class="goal-title">${htmlEscape(goal.titulo)} <span class="privacy-badge">${privLabel(goal.visibilidad)}</span></div>
              <div>${htmlEscape(goal.descripcion||'')}</div>
              <div class="goal-meta">
                <span>${goal.visibilidad==='public'?'🌐 Público':(goal.visibilidad==='friends'?'👥 Amigos':'🔒 Privado')}</span>
                <button class="goal-social-btn" data-id="${goal.id}">💬</button>
              </div>
              <div class="goal-actions">
                <button title="Editar" data-id="${goal.id}" class="edit-goal">✏️</button>
                <button title="Borrar" data-id="${goal.id}" class="del-goal">🗑️</button>
              </div>`;
            goalsList.appendChild(el);
        });
        // Handlers edit/borrar/social
        qsa('.edit-goal').forEach(btn=>btn.onclick=()=>openEditGoal(btn.dataset.id));
        qsa('.del-goal').forEach(btn=>btn.onclick=()=>deleteGoal(btn.dataset.id));
        qsa('.goal-social-btn').forEach(btn=>btn.onclick=()=>openSocial(btn.dataset.id));
    }
    // Crear/Editar objetivo
    byId('add-goal-btn').onclick = () => openGoalModal(null);
    byId('close-goal-modal').onclick = closeGoalModal;
    function openGoalModal(goalId) {
        editingGoalId = goalId;
        byId('goal-modal-title').textContent = goalId ? 'Editar objetivo' : 'Nuevo objetivo';
        byId('goal-title').value = '';
        byId('goal-desc').value = '';
        byId('goal-privacy').value = 'private';
        if(goalId){
          const goal = goals.find(g=>g.id===goalId);
          byId('goal-title').value = goal.titulo;
          byId('goal-desc').value = goal.descripcion;
          byId('goal-privacy').value = goal.visibilidad;
        }
        byId('goal-modal').classList.remove('hidden');
    }
    function closeGoalModal(){
        byId('goal-modal').classList.add('hidden');
    }
    byId('goal-form').onsubmit = async e => {
        e.preventDefault();
        if(editingGoalId){
            await updateDoc(doc(goalsCol, editingGoalId), {
                titulo: byId('goal-title').value,
                descripcion: byId('goal-desc').value,
                visibilidad: byId('goal-privacy').value,
            });
        } else {
            await addDoc(goalsCol, {
                usuario_id: currentUser.uid,
                titulo: byId('goal-title').value,
                descripcion: byId('goal-desc').value,
                visibilidad: byId('goal-privacy').value,
                creado: serverTimestamp()
            });
        }
        closeGoalModal();
    };

    // Eliminar objetivo
    async function deleteGoal(goalId){
        if(confirm('¿Seguro que quieres borrar este objetivo?')){
            await deleteDoc(doc(goalsCol, goalId));
        }
    }
    // --- SOCIAL: comentarios & reacciones ---
    const commentsCol = collection(db, 'comments');
    const reactionsCol = collection(db, 'reactions');
    let currentSocialGoalId = null;
    byId('close-social-modal').onclick = closeSocialModal;
    async function openSocial(goalId) {
        currentSocialGoalId = goalId;
        byId('social-modal').classList.remove('hidden');
        await renderSocial(goalId);
    }
    function closeSocialModal(){
        byId('social-modal').classList.add('hidden');
    }
    async function renderSocial(goalId) {
        let html = '';
        // --- Comentarios
        const qcom = query(commentsCol, where('objetivo_id', '==', goalId));
        const comsSnap = await getDocs(qcom);
        let comHtml = '';
        comsSnap.forEach(docSnap => {
            const c = docSnap.data();
            comHtml += `<div class="comment-item">
                <span class="comment-username">${htmlEscape(c.usuario_nombre||c.usuario_id||'¿?')}</span>: ${htmlEscape(c.texto)}
            </div>`;
        });
        // --- Reacciones
        const rq = query(reactionsCol, where('objetivo_id', '==', goalId));
        const rSnap = await getDocs(rq);
        const reactCount = {'👍':0,'❤️':0,'👏':0};
        rSnap.forEach(docSnap=>{
            const t = docSnap.data().tipo;
            if(reactCount[t]!==undefined) reactCount[t]++;
        });
        let reactHtml = `<div class="reactions-bar">
            <button onclick="window.idefix_react && window.idefix_react('👍')">👍 <span class="reaction-count">${reactCount['👍']}</span></button>
            <button onclick="window.idefix_react && window.idefix_react('❤️')">❤️ <span class="reaction-count">${reactCount['❤️']}</span></button>
            <button onclick="window.idefix_react && window.idefix_react('👏')">👏 <span class="reaction-count">${reactCount['👏']}</span></button>
        </div>`;
        byId('goal-social').innerHTML = `<h3>Argumentos</h3>${comHtml||'<p>Aún sin comentarios</p>'}<h3>Reacciones</h3>${reactHtml}`;
    }
    // Añadir comentario
    byId('comment-form').onsubmit = async e => {
        e.preventDefault();
        await addDoc(commentsCol, {
            objetivo_id: currentSocialGoalId,
            usuario_id: currentUser.uid,
            usuario_nombre: currentUser.displayName || currentUser.email.split('@')[0],
            texto: byId('comment-input').value,
            creado: serverTimestamp()
        });
        byId('comment-input').value = '';
        await renderSocial(currentSocialGoalId);
    };
    // Reaccionar
    window.idefix_react = async function(tipo){
        // permite una reacción por usuario por tipo por meta
        await setDoc(doc(reactionsCol, `${currentSocialGoalId}_${currentUser.uid}_${tipo}`), {
            objetivo_id: currentSocialGoalId,
            usuario_id: currentUser.uid,
            tipo
        });
        await renderSocial(currentSocialGoalId);
    };
    // Privacidad a label
    function privLabel(priv){
        return priv==="public"?'Público':(priv==="friends"?'Solo amigos':'Privado');
    }
}



