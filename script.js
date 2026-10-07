// ======================================================
// B.C CORE 10.0 — CONTINUOUS COGNITIVE SYSTEM
// ======================================================

const messagesDiv = document.getElementById("messages");
const userInput = document.getElementById("userInput");
const sendBtn = document.getElementById("sendBtn");

// ---------------- STATE ----------------

let BC = JSON.parse(localStorage.getItem("BC_10")) || {

    memory: [],

    reward: {
        good: 0,
        bad: 0
    },

    personality: {
        empathy: 50,
        curiosity: 70,
        stability: 60
    }
};

// ---------------- SAVE ----------------

function save(){
    localStorage.setItem("BC_10", JSON.stringify(BC));
}

// ======================================================
// 1. CONTINUOUS EMBEDDING SPACE (FIXED VECTOR SPACE)
// ======================================================
// cada palabra se mapea a un vector determinista

function hash(str){
    let h = 0;
    for(let i=0;i<str.length;i++){
        h = (h<<5) - h + str.charCodeAt(i);
        h |= 0;
    }
    return Math.abs(h);
}

function embed(text){

    const tokens = text.toLowerCase().split(" ");

    const vec = {x:0,y:0,z:0};

    for(let t of tokens){

        const h = hash(t);

        vec.x += Math.sin(h);
        vec.y += Math.cos(h);
        vec.z += (h % 100) / 100;
    }

    const len = Math.sqrt(vec.x**2 + vec.y**2 + vec.z**2) || 1;

    return {
        x:vec.x/len,
        y:vec.y/len,
        z:vec.z/len
    };
}

// ======================================================
// 2. SIMILARITY
// ======================================================

function similarity(a,b){
    return a.x*b.x + a.y*b.y + a.z*b.z;
}

// ======================================================
// 3. SOFTMAX ATTENTION REAL
// ======================================================

function softmax(arr){

    const max = Math.max(...arr);
    const exps = arr.map(v => Math.exp(v - max));
    const sum = exps.reduce((a,b)=>a+b,0);

    return exps.map(v => v/sum);
}

function attention(input){

    const vec = embed(input);

    const scores = BC.memory.map(m =>
        similarity(vec, m.vec)
    );

    const weights = softmax(scores);

    return BC.memory
        .map((m,i)=>({
            text:m.text,
            w:weights[i]
        }))
        .sort((a,b)=>b.w-a.w)
        .slice(0,3);
}

// ======================================================
// 4. MEMORY WITH DECAY
// ======================================================

function store(text){

    BC.memory.push({
        text,
        vec: embed(text),
        t: Date.now()
    });

    // decay temporal
    BC.memory = BC.memory.map(m => {

        const age = Date.now() - m.t;
        const decay = Math.exp(-age / 60000); // 1 min half-life

        return {
            ...m,
            weight: decay
        };
    });

    if(BC.memory.length > 80){
        BC.memory.shift();
    }
}

// ======================================================
// 5. REWARD LEARNING (RL SIMPLE)
// ======================================================

function reward(score){

    if(score > 0.6){
        BC.reward.good++;
        BC.personality.empathy += 0.5;
    } else {
        BC.reward.bad++;
        BC.personality.stability -= 0.2;
    }

    BC.personality.empathy = clamp(BC.personality.empathy,0,100);
    BC.personality.stability = clamp(BC.personality.stability,0,100);
}

// ======================================================
// 6. GRAMMAR PROBABILÍSTICA
// ======================================================

const grammar = {

    start: [
        "Entiendo {a}.",
        "He analizado {a}.",
        "Tu mensaje indica {a}.",
        "Relaciono esto con {a}."
    ],

    a: [
        "tu idea",
        "este contexto",
        "lo que dices",
        "tu mensaje",
        "esta información"
    ]
};

function generate(){

    const s = grammar.start[Math.floor(Math.random()*grammar.start.length)];
    const a = grammar.a[Math.floor(Math.random()*grammar.a.length)];

    return s.replace("{a}",a);
}

// ======================================================
// 7. DICCIONARIO EXPANDIDO (+50 PATTERNS)
// ======================================================

const dictionary = [

["hola","saludos"],
["buenas","saludos"],
["hey","saludos"],
["como estas","estado"],
["que tal","estado"],
["quien eres","identidad"],
["tu nombre","identidad"],
["que eres","identidad"],

["estoy triste","emocion_negativa"],
["me siento mal","emocion_negativa"],
["me siento solo","emocion_negativa"],
["odio esto","emocion_negativa"],
["estoy enojado","emocion_negativa"],

["estoy feliz","emocion_positiva"],
["me siento bien","emocion_positiva"],
["todo bien","emocion_positiva"],
["excelente dia","emocion_positiva"],
["me gusta esto","emocion_positiva"],

["necesito ayuda","peticion"],
["puedes ayudarme","peticion"],
["ayudame","peticion"],

["que opinas","analisis"],
["dime algo","analisis"],
["explica esto","analisis"],

["gracias","feedback_positivo"],
["muy bien","feedback_positivo"],
["perfecto","feedback_positivo"],

["mal","emocion_negativa"],
["bien","emocion_positiva"],
["ok","neutral"],
["si","confirmacion"],
["no","negacion"]
];

// ======================================================
// 8. PARSER
// ======================================================

function classify(text){

    text = text.toLowerCase();

    for(let [k,v] of dictionary){
        if(text.includes(k)){
            return v;
        }
    }

    return "unknown";
}

// ======================================================
// 9. RESPONSE ENGINE
// ======================================================

function respond(text){

    store(text);

    const att = attention(text);

    const gen = generate();

    const top = att[0]?.text || "";

    const score = att[0]?.w || 0;

    reward(score);

    return gen + (top ? " → relacionado con: " + top : "");
}
let likes =
    parseInt(localStorage.getItem("BC_LIKES")) || 0;

let dislikes =
    parseInt(localStorage.getItem("BC_DISLIKES")) || 0;

document.getElementById("likeCount").textContent = likes;
document.getElementById("dislikeCount").textContent =
    dislikes;

function like() {

    likes++;

    localStorage.setItem(
        "BC_LIKES",
        likes
    );

    document.getElementById("likeCount").textContent =
        likes;
}

function dislike() {

    dislikes++;

    localStorage.setItem(
        "BC_DISLIKES",
        dislikes
    );

    document.getElementById("dislikeCount").textContent =
        dislikes;
}
function renderComments() {

    const list =
        document.getElementById("comments-list");

    list.innerHTML = "";

    const comments =
        JSON.parse(
            localStorage.getItem("BC_COMMENTS")
        ) || [];

    comments.forEach(comment => {

        const div =
            document.createElement("div");

        div.style.marginBottom = "8px";

        div.textContent = comment;

        list.appendChild(div);

    });
}

function addComment() {

    const input =
        document.getElementById("commentInput");

    const text =
        input.value.trim();

    if (!text)
        return;

    const comments =
        JSON.parse(
            localStorage.getItem("BC_COMMENTS")
        ) || [];

    comments.push(text);

    localStorage.setItem(
        "BC_COMMENTS",
        JSON.stringify(comments)
    );

    input.value = "";

    renderComments();
}
// ======================================================
// 10. UI
// ======================================================

function addMessage(role,text){

    const div = document.createElement("div");
    div.className = role;
    div.textContent = text;

    messagesDiv.appendChild(div);
    messagesDiv.scrollTop = messagesDiv.scrollHeight;
}
function clearMemory() {

    if (!confirm("¿Reiniciar Black Chat?"))
        return;

    localStorage.removeItem("BC_10");

    BC = {
        memory: [],
        reward: {
            good: 0,
            bad: 0
        },
        personality: {
            empathy: 50,
            curiosity: 70,
            stability: 60
        }
    };

    messagesDiv.innerHTML = "";

    addMessage(
        "bot",
        "Memoria reiniciada."
    );
}
// ======================================================
// 11. SEND
// ======================================================

function send(){

    const text = userInput.value.trim();
    if(!text) return;

    addMessage("user",text);
    userInput.value="";

    const reply = respond(text);

    addMessage("bot",reply);

    save();
}

// ======================================================
// EVENTS
// ======================================================

sendBtn?.addEventListener("click",send);

userInput?.addEventListener("keydown",e=>{
    if(e.key==="Enter")send();
});

// ======================================================
// INIT
// ======================================================

window.onload = () => {

    addMessage(
        "bot",
        "🖤 BLACK CHAT ONLINE"
    );

    renderComments();

    const profile =
        JSON.parse(
            localStorage.getItem("BC_PROFILE")
        );

    if (profile) {

        document.getElementById(
            "userIdDisplay"
        ).textContent = profile.id;
    }

    document.getElementById(
        "likeCount"
    ).textContent = likes;

    document.getElementById(
        "dislikeCount"
    ).textContent = dislikes;
};
// =====================================
// SISTEMA DE IDENTIDAD B.C
// =====================================

function generateUserId() {
    return Math.floor(
        1000000000 + Math.random() * 9000000000
    ).toString();
}

function saveProfile() {

    const name = document.getElementById("userName").value.trim();
    const age = document.getElementById("userAge").value.trim();
    const gender = document.getElementById("userGender").value;

    if (!name) {
        alert("Ingresa un nombre.");
        return;
    }

    const profile = {
        id: generateUserId(),
        name,
        age,
        gender
    };

    localStorage.setItem(
        "BC_PROFILE",
        JSON.stringify(profile)
    );

    document.getElementById("userIdDisplay").textContent =
        profile.id;

    alert("Cuenta guardada.");
}

function loginWithId() {

    const id =
        document.getElementById("loginId").value.trim();

    const profile =
        JSON.parse(localStorage.getItem("BC_PROFILE"));

    if (!profile) {
        alert("No existe ninguna cuenta.");
        return;
    }

    if (profile.id === id) {

        document.getElementById("userName").value =
            profile.name;

        document.getElementById("userAge").value =
            profile.age;

        document.getElementById("userGender").value =
            profile.gender;

        document.getElementById("userIdDisplay").textContent =
            profile.id;

        alert("Cuenta recuperada.");
    } else {
        alert("ID incorrecto.");
    }
}
