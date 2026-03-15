let fa_count = 0;

function createFA_HTMLBlock(name, type, callback) { 
    $("#machine-display-box").append(
`<div id="${type}${fa_count}" class="fa-box">
    <p class="machine-name-box">${name}</p>
</div>`
    );

    $(`#${type}${fa_count++}`).bind("click", () => {
        let fa = loadFA(name);
        callback(fa);
        destroyModal();
    });
}
function createModal(title) {
    $("#main").append(`<div id="modal" class="modal">
    <div class="modal-content">
        <a>${title}</a>
        <span id="close-btn" class="close">&times;</span>
        <br><br>
        <div class="flex-container" id="machine-display-box" style="border:solid 2px black; padding:10px;"> 

        </div>
    </div>
</div>`);
    $("#close-btn").bind("click", destroyModal);
}

function destroyModal() {
    $("#modal").remove();
}

function createSaveModal(name) {
     $("#topbar").append(`<div id="save-modal">
        <a>FA "${name}" has been saved successfully</a>
    </div>`);
    $("#save-modal").fadeTo(3000,0, () => $("#save-modal").remove()) 
}

function newFA() {
    two.clear();
    for (let e of renders) {
        e.remove();
    }
    renders = [];
    states = [];

    for (let es of transitionRenders) {
        for (let e of es) {
            if (e)
                e.remove();
        }
    }
    transitionRenders = [];
    transitions = [];

    currentFA = new NFA("", 0);
    $("#name-box").val("");
}

function saveFA(m) {
    if (!m) {
        window.alert("Undefined");
        return false;
    }

    m.name = $("#name-box").val();

    if (m.name == "") {
        window.alert("Automata needs to have a name");
        return false;
    }
    if (m.states <= 0) {
        window.alert("Automata must have at least one state");
        return false;
    }

    let m_modified = structuredClone(m);
    m_modified.acceptingStates = Array.from(m_modified.acceptingStates);
    
    let obj = {}

    for (let [k,v] of m.transitions.entries()) {
        let obj_1 = {}
        for (let [c, dests] of v.entries()) {
            obj_1[c] = dests;
        }
        obj[k] = obj_1;
    }

    m_modified.transitions = obj;

    let m_serialised = JSON.stringify(m_modified);

    localStorage.setItem(m.name, m_serialised);

    createSaveModal(m.name);

    return true;
}

function saveCopyFA(m) {
    if (!m) {
        window.alert("Not an FA");
        return;
    }

    m.name = $("#name-box").val();

    if (m.name == "") {
        window.prompt("Automata needs to have a name");
        return;
    }
    if (m.states <= 0) {
        window.prompt("Automata must have at least one state");
        return;
    }

    let m_copy = structuredClone(m);

    m_copy.name += " (copy)";
    m_copy.acceptingStates = Array.from(m_copy.acceptingStates);

    let obj = {}

    for (let [k,v] of m.transitions.entries()) {
        let obj_1 = {}
        for (let [c, dests] of v.entries()) {
            obj_1[c] = dests;
        }
        obj[k] = obj_1;
    }

    m_copy.transitions = obj;

    let m_serialised = JSON.stringify(m_copy);

    localStorage.setItem(m_copy.name, m_serialised);
}

function loadFA(name) {
    let m_serialised = localStorage.getItem(name);
    $("#name-box").val(name);
    let fa_raw = JSON.parse(m_serialised);
    let fa;
    if (fa_raw.type == "DFA")
        fa = Object.assign(new DFA(), fa_raw);
    else
        fa = Object.assign(new NFA(), fa_raw);

    fa.acceptingStates = new Set(fa.acceptingStates);
    let map = new Map();
    for (let i in fa.transitions) {
        let map1 = new Map();
        let v = fa.transitions[i];
        for (let j in v) {
            let v1 = v[j];
            map1.set(j, v1);
        }
        map.set(Number(i), map1);
    }
    fa.transitions = map;
    return fa;
}

function setCurrentFA(fa) {
    currentFA = fa;
    drawCurrentFA();
}

function openFA() {
    createModal("Open FA...");
    for (let i = 0; i < localStorage.length; i++) {
        let fa_name = localStorage.key(i);
        let type = JSON.parse(localStorage.getItem(fa_name)).type;
        createFA_HTMLBlock(fa_name, type, setCurrentFA);
    }
}

function deleteFA(name) {
    localStorage.removeItem(name);
}