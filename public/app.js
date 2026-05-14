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
getDocs,
onSnapshot
} from "https://www.gstatic.com/firebasejs/12.12.1/firebase-firestore.js";

/* ================= FIREBASE ================= */

const firebaseConfig = {
apiKey:"AIzaSyAA5wMkP7E7-kSsxSpXrbhMTACdqFutf84",
authDomain:"base-de-datos-assist-app.firebaseapp.com",
projectId:"base-de-datos-assist-app"
};

const app=initializeApp(firebaseConfig);
const auth=getAuth(app);
const db=getFirestore(app);

/* ================= CONFIG ================= */

const SECRET="ASSISTAPP_2026";
const PIN_SOPORTE="847291";

const CURSOS=[
"1°1°","1°2°","1°3°","1°4°",
"2°1°","2°2°","2°3°",
"3°1°","3°2°","3°3°",
"4°1° Informática","4°2° Informática","4°3° Electricidad",
"5°1° Informática","5°2° Informática","5°3° Electricidad",
"6°1° Informática","6°2° Electricidad",
"7°1° Informática","7°2° Electricidad"
];

const TURNOS={
"1°1°":{hora:7,min:20,tolerancia:15},
"1°2°":{hora:7,min:20,tolerancia:15},
"1°3°":{hora:7,min:20,tolerancia:15},
"1°4°":{hora:7,min:20,tolerancia:15},

"2°1°":{hora:13,min:0,tolerancia:20},
"2°2°":{hora:13,min:0,tolerancia:20},
"2°3°":{hora:13,min:0,tolerancia:20},

"3°1°":{hora:15,min:0,tolerancia:15},
"3°2°":{hora:16,min:0,tolerancia:15},
"3°3°":{hora:17,min:0,tolerancia:15},

"4°1° Informática":{hora:18,min:0,tolerancia:15},
"4°2° Informática":{hora:19,min:0,tolerancia:15},
"4°3° Electricidad":{hora:20,min:0,tolerancia:15},

"5°1° Informática":{hora:18,min:0,tolerancia:15},
"5°2° Informática":{hora:19,min:0,tolerancia:15},
"5°3° Electricidad":{hora:20,min:0,tolerancia:15},

"6°1° Informática":{hora:18,min:0,tolerancia:15},
"6°2° Electricidad":{hora:19,min:0,tolerancia:15},

"7°1° Informática":{hora:18,min:0,tolerancia:15},
"7°2° Electricidad":{hora:19,min:0,tolerancia:15}
};

/* ================= VARIABLES ================= */

let alumnos={};
let presentes={};
let cursosAbiertos={};

let scanner=null;
let qrInterval=null;
let unsubscribeAsistencia=null;

let rolActual="alumno";
let fechaHoy=new Date().toISOString().split("T")[0];

const okSound=new Audio(
"https://actions.google.com/sounds/v1/cartoon/clang_and_wobble.ogg"
);

/* ================= WINDOW ================= */

window.mostrarLogin=()=>show("loginScreen");
window.mostrarRegistro=()=>show("registroScreen");
window.volverMenu=()=>show("menuScreen");
window.iniciarSesion=iniciarSesion;
window.registrar=registrar;
window.cerrarSesion=cerrarSesion;
window.iniciarScanner=iniciarScanner;
window.detenerScanner=detenerScanner;
window.exportarExcel=exportarExcel;
window.cambiarFecha=()=>{

fechaHoy=document.getElementById("fechaInput").value;
escucharAsistencia();

};

/* ================= INIT ================= */

document.addEventListener("DOMContentLoaded",()=>{

cargarCursos();

const f=document.getElementById("fechaInput");
if(f)f.value=fechaHoy;

});

/* ================= UTILS ================= */

function show(id){

document.querySelectorAll(".screen")
.forEach(s=>s.classList.remove("active"));

document.getElementById(id)?.classList.add("active");

}

function cargarCursos(){

const select=document.getElementById("curso");
if(!select)return;

select.innerHTML="";

CURSOS.forEach(c=>{
const o=document.createElement("option");
o.value=c;
o.textContent=c;
select.appendChild(o);
});

}

async function hash(text){

const data=new TextEncoder().encode(text);
const buffer=await crypto.subtle.digest("SHA-256",data);

return Array.from(new Uint8Array(buffer))
.map(b=>b.toString(16).padStart(2,"0"))
.join("");

}

function calcularEstado(uid){

const alumno=alumnos[uid];
const turno=TURNOS[alumno.curso];

if(!turno)return"presente";

const ahora=new Date();
const limite=new Date();

limite.setHours(turno.hora);
limite.setMinutes(turno.min+turno.tolerancia);

return ahora<=limite?"presente":"tarde";

}

/* ================= QR ================= */

async function generarQR(uid){

const token=`${uid}|${Date.now()}`;
const firma=await hash(token+SECRET);

QRCode.toCanvas(
document.getElementById("qrCanvas"),
`${token}|${firma}`,
{width:240}
);

}

async function validarQR(data){

const [uid,time,firma]=data.split("|");

const real=await hash(`${uid}|${time}`+SECRET);

if(real!==firma)return null;
if(Date.now()-Number(time)>10000)return null;

return uid;

}

/* ================= AUTH ================= */

async function iniciarSesion(){
try{

await signInWithEmailAndPassword(
auth,
document.getElementById("emailLogin").value.trim(),
document.getElementById("passwordLogin").value
);

}catch(e){
alert(e.message);
console.error(e);
}
}

async function registrar(){

const pin=Math.floor(1000+Math.random()*9000).toString();

const cred=await createUserWithEmailAndPassword(
auth,
emailRegistro.value.trim(),
passwordRegistro.value
);

await setDoc(doc(db,"usuarios",cred.user.uid),{
nombre:nombre.value,
apellido:apellido.value,
curso:curso.value,
email:emailRegistro.value,
rol:"alumno",
pin
});

alert("Registrado\nPIN alumno: "+pin);

}

async function cerrarSesion(){

const pin=prompt("PIN soporte");

if(pin!==PIN_SOPORTE){
alert("PIN incorrecto");
return;
}

clearInterval(qrInterval);

if(scanner){
await scanner.clear();
scanner=null;
}

await signOut(auth);

}

/* ================= AUTH STATE ================= */

onAuthStateChanged(auth,async user=>{

if(!user){
show("menuScreen");
return;
}

const snap=await getDoc(doc(db,"usuarios",user.uid));

if(!snap.exists())return;

rolActual=snap.data().rol;

await cargarAlumnos();
escucharAsistencia();

if(["admin","profesor","docente","maestro"].includes(rolActual)){
show("adminScreen");
return;
}

show("qrScreen");

const pin=document.getElementById("pinAlumno");
if(pin)pin.textContent=`PIN: ${snap.data().pin}`;

await generarQR(user.uid);

qrInterval=setInterval(()=>{
generarQR(user.uid);
},10000);

});

/* ================= DATA ================= */

async function cargarAlumnos(){

alumnos={};

const snap=await getDocs(collection(db,"usuarios"));

snap.forEach(d=>{
alumnos[d.id]=d.data();
});

render();

}

function escucharAsistencia(){

if(unsubscribeAsistencia)unsubscribeAsistencia();

unsubscribeAsistencia=onSnapshot(
doc(db,"asistencias",fechaHoy),
snap=>{

presentes=snap.exists()
?snap.data().presentes||{}
:{};

render();

});

}

/* ================= RENDER ================= */

function render(){

const cont=document.getElementById("cursos");
if(!cont)return;

cont.className="cursos-grid";
cont.innerHTML="";

const agrupados={};

Object.entries(alumnos).forEach(([id,a])=>{

const curso=a.curso||"Sin curso";

if(!agrupados[curso])agrupados[curso]=[];

agrupados[curso].push({id,...a});

});

Object.entries(agrupados).forEach(([curso,lista])=>{

const abierto=cursosAbiertos[curso]||false;

const pres=lista.filter(a=>presentes[a.id]).length;
const porc=Math.round((pres/lista.length)*100)||0;

const bloque=document.createElement("div");
bloque.className="curso-bloque";

const titulo=document.createElement("h3");
titulo.textContent=`${abierto?"▼":"▶"} ${curso}`;

titulo.onclick=()=>{
cursosAbiertos[curso]=!abierto;
render();
};

bloque.appendChild(titulo);

const p=document.createElement("p");
p.textContent=`${pres}/${lista.length} presentes (${porc}%)`;
bloque.appendChild(p);

if(abierto){

lista.forEach(a=>{

const estado=presentes[a.id]||"ausente";

const div=document.createElement("div");
div.className=estado;

div.textContent=
`${estado==="presente"?"🟢":estado==="tarde"?"🟡":"🔴"} ${a.nombre} ${a.apellido}`;

bloque.appendChild(div);

});

}

cont.appendChild(bloque);

});

actualizarPorcentaje();
}

function actualizarPorcentaje(){

const total=Object.keys(alumnos).length;
const hoy=Object.keys(presentes).length;

const p=document.getElementById("porcentaje");

if(p){
p.innerHTML=`Hoy: ${total?Math.round((hoy/total)*100):0}%`;
}

}

/* ================= SCANNER ================= */

function iniciarScanner(){

show("scannerScreen");

scanner=new Html5QrcodeScanner("reader",{
fps:10,
qrbox:250
});

scanner.render(async data=>{

const uid=await validarQR(data);

if(!uid)return alert("QR inválido");

const pin=prompt("PIN del alumno");

if(pin!==alumnos[uid].pin){
alert("PIN incorrecto");
return;
}

if(presentes[uid])return alert("Ya presente");

presentes[uid]=calcularEstado(uid);

await setDoc(doc(db,"asistencias",fechaHoy),{
presentes
});

okSound.play();
alert("Registrado");

});

}

async function detenerScanner(){

if(scanner){
await scanner.clear();
scanner=null;
}

show("adminScreen");

}

/* ================= EXPORT ================= */

function exportarExcel(){

let csv="Fecha,Nombre,Apellido,Curso,Estado\n";

Object.entries(alumnos).forEach(([id,a])=>{

csv+=`${fechaHoy},${a.nombre},${a.apellido},${a.curso},${presentes[id]||"ausente"}\n`;

});

const blob=new Blob([csv]);

const a=document.createElement("a");
a.href=URL.createObjectURL(blob);
a.download="asistencia.csv";
a.click();

}