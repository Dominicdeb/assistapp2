// ================= FIREBASE =================
import { initializeApp } from "https://www.gstatic.com/firebasejs/12.12.1/firebase-app.js";

import {
  getAuth,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  onAuthStateChanged,
  signOut
} from "https://www.gstatic.com/firebasejs/12.12.1/firebase-auth.js";

import {
  getFirestore,
  doc,
  setDoc,
  getDoc,
  collection,
  getDocs
} from "https://www.gstatic.com/firebasejs/12.12.1/firebase-firestore.js";

// CONFIG
const firebaseConfig = {
  apiKey: "AIzaSyAA5wMkP7E7-kSsxSpXrbhMTACdqFutf84",
  authDomain: "base-de-datos-assist-app.firebaseapp.com",
  databaseURL: "https://base-de-datos-assist-app-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId: "base-de-datos-assist-app",
  storageBucket: "base-de-datos-assist-app.firebasestorage.app",
  messagingSenderId: "1036349150991",
  appId: "1:1036349150991:web:f18e40e64dd2eb9917907a",
  measurementId: "G-1RR0QRGWYV"
};


const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

// ================= VARIABLES =================
let alumnos = {};
let presentes = {};
const fechaHoy = new Date().toISOString().split("T")[0];

// ================= UI =================
const screens = document.querySelectorAll(".screen");

function show(id){
  screens.forEach(s=>s.classList.remove("active"));
  document.getElementById(id).classList.add("active");
}

// 👇 GLOBAL (IMPORTANTE)
window.mostrarLogin = ()=>show("loginScreen");
window.mostrarRegistro = ()=>show("registroScreen");
window.volverMenu = ()=>show("menuScreen");

// ================= LOGIN =================
window.iniciarSesion = async ()=>{
  try{
    const email = document.getElementById("emailLogin").value;
    const password = document.getElementById("passwordLogin").value;

    await signInWithEmailAndPassword(auth, email, password);

  }catch(e){
    alert(e.message);
  }
};

// ================= REGISTRO =================
window.registrar = async ()=>{
  try{
    const email = document.getElementById("emailRegistro").value;
    const password = document.getElementById("passwordRegistro").value;

    const cred = await createUserWithEmailAndPassword(auth, email, password);

    await setDoc(doc(db,"usuarios",cred.user.uid),{
      email,
      nombre: document.getElementById("nombre").value || "",
      apellido: document.getElementById("apellido").value || "",
      curso: document.getElementById("curso").value || "",
      rol:"alumno"
    });

    alert("Registrado");

  }catch(e){
    alert(e.message);
  }
};

// ================= SESSION =================
onAuthStateChanged(auth, async (user)=>{
  if(!user){
    show("menuScreen");
    return;
  }

  const snap = await getDoc(doc(db,"usuarios",user.uid));
  const data = snap.data();

  if(data?.rol === "admin"){
    show("adminScreen");
    await cargarAlumnos();
  }else{
    show("qrScreen");
    generarQR(user.uid);
  }
});

// ================= QR =================
function generarQR(id){
  QRCode.toCanvas(
    document.getElementById("qrCanvas"),
    id
  );
}

// ================= DATA =================
async function cargarAlumnos(){
  alumnos = {};

  const snap = await getDocs(collection(db,"usuarios"));

  snap.forEach(d=>{
    alumnos[d.id] = d.data();
  });

  render();
}

function render(){
  const cont = document.getElementById("cursos");
  cont.innerHTML = "";

  Object.entries(alumnos).forEach(([id,a])=>{
    const div = document.createElement("div");
    div.textContent = `${a.nombre} ${a.apellido} - ${a.curso}`;
    cont.appendChild(div);
  });
}

// ================= ASISTENCIA =================
window.marcarAsistencia = async (user_id)=>{
  if(presentes[user_id]){
    alert("Ya registrado");
    return;
  }

  presentes[user_id] = true;

  await setDoc(doc(db,"asistencia",fechaHoy),{
    presentes
  });

  alert("✔ Presente");
};

// ================= LOGOUT =================
window.cerrarSesion = ()=>signOut(auth);