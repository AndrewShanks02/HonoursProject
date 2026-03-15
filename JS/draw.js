var elem = $(".canvas")[0];
const WIDTH = window.innerWidth-$(".leftbar").width();
const HEIGHT = window.innerHeight-$(".topbar").height();
var two = new Two({width: WIDTH, height: HEIGHT}).appendTo(elem);

const minX = 0;
const minY = 0;
const C = 0.1;
const AREA = 1389600;

function drawState(name, x, y, initial=false, final=false) {
    let circle = two.makeCircle(x,y,15);
    circle.fill = 'gray';
    if (!final)
        circle.stroke = 'darkgray';
    else
        circle.stroke = '#2bfb3c';
    circle.linewidth = 2;

    let text = two.makeText(name,x,y);
    if (initial) {
        let initialStateArrow = two.makeArrow(x-50,y,x-17,y,10);
        initialStateArrow.stroke = 'black';
        initialStateArrow.linewidth = 2;
        return two.makeGroup(circle, text, initialStateArrow);
    }

    return two.makeGroup(circle, text);
}

function drawTransition(q1, q2, offset=0, rule=null, reverseArrow=false) {
    if (q1 != q2) {
        let v = [q1.x-q2.x, q1.y-q2.y];
        let angle = Math.atan2(v[1], v[0]);

        let perp = angle+Math.PI/2;
        let perpDx = offset*Math.cos(perp);
        let perpDy = offset*Math.sin(perp);

        let dx = (17-0.5*offset)*Math.cos(angle);
        let dy = (17-0.5*offset)*Math.sin(angle);

        let arrow = two.makeArrow(q1.x-dx+perpDx,q1.y-dy+perpDy,q2.x+dx+perpDx+Math.cos(angle)*offset/1.3,q2.y+dy+perpDy,10);
        arrow.stroke = 'black';
        arrow.linewidth = 2;

        if (rule != null) {
            let textOffset = 10;
            if (reverseArrow) {
                textOffset = -10;
            }
            let textDx = textOffset*Math.cos(perp);
            let textDy = textOffset*Math.sin(perp);
            let text = two.makeText(rule, (q1.x+q2.x)/2+textDx+perpDx, (q1.y+q2.y)/2+textDy+perpDy);

            return two.makeGroup(arrow, text);
        }
    } else {
        let x = q1.x;
        let y = q1.y;
        let curve = two.makeCurve(x-12,y-12, x-7.5,y-35, x+7.5,y-35, x+12,y-12, true);
        curve.linewidth = 2;
        let offset = 5;
        let angle1 = offset+45;
        angle1 *= Math.PI/180;
        let angle2 = offset+135;
        angle2 *= Math.PI/180;
        let r = 10;
        let line1 = two.makeLine(x+12,y-12, x+12-r*Math.cos(angle1), y-12-r*Math.sin(angle1));
        line1.linewidth = 2;
        let line2 = two.makeLine(x+12,y-12, x+12-r*Math.cos(angle2), y-12-r*Math.sin(angle2));
        line2.linewidth = 2;
        let arrow = two.makeGroup(curve, line1, line2)
        let text = two.makeText(rule, x, y-45);
        return two.makeGroup(arrow, text);
    }
}

let fa = function(k) {
    return function(d) {
        return d*d/k;
    }
}

let fr = function(k) {
    return function(d) {
        return k*k/(d*d);
    }
}

const ITERS = 15;

function addVecs(u, v) {
    let w = []
    for (let i = 0; i < u.length; i++) {
        w.push(u[i] + v[i]);
    }

    return w;
}

function scalarMult(v, k) {
    let u = [];
    for (let i = 0; i < v.length; i++) {
        u.push(v[i] * k);
    }
    return u;
}

function multVecs(u, v) {
    let w = []
    for (let i = 0; i < u.length; i++) {
        w.push(u[i] * v[i]);
    }

    return w;
}

function norm(v) {
    return Math.sqrt(
        v.reduce(
            (p, x) => p + x*x,
            0
        )
    )
}

function normalise(v) {
    let n = norm(v);
    let u = []
    for (let i = 0; i < v.length; i++) {
        u.push(v[i] / n);
    }
    return u;
}

function clamp(x, low, high) {
    return Math.max(low, Math.min(x, high));
}

let sleep = ms => new Promise(r => setTimeout(r, ms));

async function displaceGraph(nodes, edges) {
    let k = C*Math.sqrt(AREA/nodes.length);
    let t = 400;
    let vDisps = new Array(nodes.length);
    let alpha = 0.00125;
    let fa_k = fa(k);
    let fr_k = fr(k);

    let drawGraph = (states) => {
        for (let qi of states) {
            drawState(qi.name, qi.x, qi.y, qi.isInitial, qi.isFinal)
        }
        two.update();
    }

    // await sleep(1000);
    for (let i = 0; i < 4; i++) {
        for (let j = 0; j < nodes.length; j++) {
            vDisps[j] = [0,0];
            // drawState(nodes[j].name, nodes[j].x, nodes[j].y, nodes[j].isInitial, nodes[j].isFinal);
            for (let k = 0; k < nodes.length; k++) {
                if (j != k) {
                    let diff = [nodes[j].x-nodes[k].x, nodes[j].y-nodes[k].y];
                    vDisps[j] = addVecs(vDisps[j], scalarMult(normalise(diff), fr_k(norm(diff))));
                    // drawGraph(nodes);
                    // drawTransition(nodes[j], {x: nodes[j].x+diff[0], y: nodes[j].y+diff[1]});
                }
            }
            console.log(`${j} : ${vDisps[j]}`);
        }

        for (let j = 0; j < edges.length; j++) {
            for (let k = 0; k < edges.length; k++) {
                if (j != k && edges[j][k] != "") {
                    let diff = [nodes[j].x-nodes[k].x, nodes[j].y-nodes[k].y];
                    vDisps[j] = addVecs(vDisps[j], scalarMult(normalise(diff), -fa_k(norm(diff))));
                    vDisps[k] = addVecs(vDisps[k], scalarMult(normalise(diff), fa_k(norm(diff))));
                }
            }
        }

        for (let j = 0; j < nodes.length; j++) {
            // let x = multVecs(normalise(vDisps[j]), vDisps[j].map(x => Math.min(x, t)));
            let x = vDisps[j];
            nodes[j].x += x[0];
            nodes[j].y += x[1];
            nodes[j].x = clamp(nodes[j].x, 30, window.innerWidth);
            nodes[j].y = clamp(nodes[j].y, 30, window.innerHeight);
            
            nodes[j].render.x = nodes[j].x;
            nodes[j].render.y = nodes[j].y;

            two.update();
        }

        t -= alpha*i; // cool t by some amount
    }

    for (let i = 0; i < states.length; i++) {
        for (let j = i; j < states.length; j++) {
            if (transitions[i][j] != "") {
                if (transitions[j][i] != "" && i != j) {
                    drawTransition(states[i], states[j], 10, transitions[i][j], false);
                    drawTransition(states[j], states[i], 10, transitions[j][i], true);
                } else {
                    drawTransition(states[i], states[j], 0, transitions[i][j]);
                }
            } else if (transitions[j][i] != "") {
                drawTransition(states[j], states[i], 0, transitions[j][i]);
            }
        }
    }

    drawGraph(nodes);
}

let rnd = (a,b) => Math.floor(Math.random() * (b-a))+a;

var states = [];
var transitions;
var renders = [];
var transitionRenders = [];

let drawGraph = (states, transitions) => {
    two.clear();

    for (let i = 0; i < renders.length; i++) {
        renders[i].remove();
    }

    for (let i = 0; i < transitionRenders.length; i++) {
        for (let j = 0; j < transitionRenders.length; j++) {
            if (transitionRenders[i][j])
                transitionRenders[i][j].remove();
        }
    }

    renders = [];
    transitionRenders = new Array(states.length);
    for (let i = 0; i < states.length; i++) {
        transitionRenders[i] = new Array(states.length);
        for (let j = 0; j < states.length; j++) {
            transitionRenders[i][j] = undefined;
        }
    }

    for (let i = 0; i < states.length; i++) {
        for (let j = i; j < states.length; j++) {
            if (transitions[i][j] != "") {
                if (transitions[j][i] != "" && i != j) {
                    transitionRenders[i][j] = drawTransition(states[i], states[j], 10, transitions[i][j], false);
                    transitionRenders[j][i] = drawTransition(states[j], states[i], 10, transitions[j][i], true);
                } else {
                    transitionRenders[i][j] = drawTransition(states[i], states[j], 0, transitions[i][j]);
                }
            } else if (transitions[j][i] != "") {
                transitionRenders[j][i] = drawTransition(states[j], states[i], 0, transitions[j][i]);
            }
        }
    }


    for (let qi of states) {
        renders.push(
            drawState(qi.name, qi.x, qi.y, qi.isInitial, qi.isFinal)
        );
    }
    two.update();
}

function getTransitions(m) {
    transitions = new Array(states.length);
    for (let i = 0; i < states.length; i++) {
        transitions[i] = new Array(states.length);
        for (let j = 0; j < states.length; j++) {
            transitions[i][j] = "";
        }

        for (let c of Array.from(m.alphabet).concat([''])) {
            let x = m.transitions.get(i);
            let ec = (c == '')? 'ε' : c;

            if (!x)
                continue;
            
            let y = x.get(c);
            if (y == undefined)
                continue;

            if (m instanceof NFA) {
                for (let j of y) {
                    if (transitions[i][j] == "") {
                        transitions[i][j] = ec;
                    } else {
                        transitions[i][j] += `,${ec}`;
                    }
                }
            } else if (m instanceof DFA) {
                if (transitions[i][y] == "") {
                    transitions[i][y] = ec;
                } else {
                    transitions[i][y] += `,${ec}`;
                }
            }
        }
    }
}

function toggleFinal() {
    if (contextSelectorNode != -1) {
        if (currentFA.isFinal(contextSelectorNode)) {
            currentFA.removeAcceptingState(contextSelectorNode);
        } else {
            currentFA.addAcceptingState(contextSelectorNode);
        }
        states[contextSelectorNode].isFinal = !states[contextSelectorNode].isFinal;
        drawGraph(states, transitions);
    }
}

$("#final-button-ctx").on("click", toggleFinal);

function setInitial() {
    if (contextSelectorNode != -1) {
        states[currentFA.getInitialState()].isInitial = false;
        states[contextSelectorNode].isInitial = true;
        currentFA.setInitialState(contextSelectorNode);
        drawGraph(states, transitions);
    }
}

$("#initial-button-ctx").on("click", setInitial);

function isOverlapping(m, q) {
    let qx = states[q].x;
    let qy = states[q].y;

    for (let i = 0; i < m.numStates; i++) {
        if (i != q) {
            let v = [states[i].x-qx, states[i].y-qy];
            let m = Math.sqrt(v[0]*v[0] + v[1]*v[1]);

            if (m < 24) {
                return i;
            }
        }
    }
    return -1;
}

function addState() {
    currentFA.addState();
    let qn = currentFA.numStates-1;
    states.push(
        {name:`q${qn}`, x:WIDTH/2, y:HEIGHT/2, isInitial:false, isFinal:currentFA.isFinal(qn)}
    );

    let qi = isOverlapping(currentFA, qn);
    while (qi != -1) {
        let v = [states[qi].x-states[qn].x, states[qi].y-states[qn].y];
        let m = Math.sqrt(v[0]*v[0] + v[1]*v[1]);

        if (m == 0) {
            let angle = rnd(0,359)*Math.PI/180;
            v = [Math.cos(angle), Math.sin(angle)];
        } else {
            v[0] /= m;
            v[1] /= m;
        }

        let r = 30-m;
        states[qn].x += r*v[0];
        states[qn].y += r*v[1];
        qi = isOverlapping(currentFA, qn);
    }

    states[currentFA.getInitialState()].isInitial = true;

    getTransitions(currentFA);

    drawGraph(states, transitions);
}
 

let FAtoGraph = (m) => {

    // let states = [
    //     {name:"q0", x: rnd(30, 1360), y: rnd(30, 450), isInitial: true, isFinal: false},
    //     {name:"q1", x: rnd(30, 1360), y: rnd(30, 970), isInitial: false, isFinal: false},
    //     {name:"q2", x: rnd(30, 1360), y: rnd(30, 970), isInitial: false, isFinal: true}
    // ];

    let k = 2*Math.PI/m.numStates;
    let r = 225;

    // for (let i = 0; i < states.length; i++) {
    //     states[i].x = ;
    //     states[i].y = ;
    // }

    states = [];
    for (let i = 0; i < m.numStates; i++) {
        states.push({
            name:`q${i}`,
            x: WIDTH/2 + r*Math.cos(i*k-Math.PI/2),
            y: HEIGHT/2 + r*Math.sin(i*k-Math.PI/2),
            isInitial: false,
            isFinal: (m.isFinal(i))? true : false
        });
    }

    states[m.getInitialState()].isInitial = true;

    getTransitions(m);

    for (let i = 0; i < renders.length; i++) {
        renders[i].remove();
    }

    for (let i = 0; i < transitionRenders.length; i++) {
        for (let j = 0; j < transitionRenders.length; j++) {
            if (transitionRenders[i][j])
                transitionRenders[i][j].remove();
        }
    }

    renders = [];
    transitionRenders = new Array(states.length);
    for (let i = 0; i < states.length; i++) {
        transitionRenders[i] = new Array(states.length);
        for (let j = 0; j < states.length; j++) {
            transitionRenders[i][j] = undefined;
        }
    }
}

$("#name-box").val("");

function drawCurrentFA() {
    $("#name-box").val(currentFA.name);
    FAtoGraph(currentFA);
    drawGraph(states, transitions);
}

let lastMouse = [0,0];
let mouse = [0,0];
let currentPos = {x: 0, y: 0};
let secondHeld = -1;

var newArrow;
var transitionTool = false;
var tempRender;
var prevRender;

$("#transition-tool").on("click", () => {
    $("#transition-tool").addClass("button-selected");
    $("#selection-tool").removeClass("button-selected");
    transitionTool = true;
});

$("#selection-tool").on("click", () => {
    $("#transition-tool").removeClass("button-selected");
    $("#selection-tool").addClass("button-selected");
    transitionTool = false;
});

window.addEventListener('mousemove', e => {
    mouse = [
        e.clientX-lastMouse[0],
        e.clientY-lastMouse[1]
    ];

    lastMouse = [e.clientX, e.clientY];

    if (newArrow) {
        newArrow.remove();
    }

    if (heldNode != -1) {
        if (!transitionTool) {
            states[heldNode].x += mouse[0];
            states[heldNode].y += mouse[1];
            renders[heldNode].translation.x += mouse[0];
            renders[heldNode].translation.y += mouse[1];

            if (transitionRenders[heldNode][heldNode]) {
                transitionRenders[heldNode][heldNode].translation.x += mouse[0];
                transitionRenders[heldNode][heldNode].translation.y += mouse[1];
            }

            for (let i = 0; i < transitionRenders.length; i++) {
                if (i == heldNode)
                    continue;

                let a = false;
                let b = false;

                if (transitionRenders[i][heldNode]) {
                    transitionRenders[i][heldNode].remove();
                    a = true;
                }

                if (transitionRenders[heldNode][i]) {
                    transitionRenders[heldNode][i].remove();
                    b = true;
                }

                if (a && b) {
                    transitionRenders[i][heldNode] = drawTransition(states[i], states[heldNode], 10, transitions[i][heldNode], false);
                    transitionRenders[heldNode][i] = drawTransition(states[heldNode], states[i], 10, transitions[heldNode][i], true);
                } else if (a) {
                    transitionRenders[i][heldNode] = drawTransition(states[i], states[heldNode], 0, transitions[i][heldNode]);
                } else if (b) {
                    transitionRenders[heldNode][i] = drawTransition(states[heldNode], states[i], 0, transitions[heldNode][i]);
                }
            }
        } else {
            currentPos.x += mouse[0];
            currentPos.y += mouse[1];
            secondHeld = -1;

            for (let i = 0; i < states.length; i++) {
                let dx = states[i].x-e.clientX+155;
                let dy = states[i].y-e.clientY+$(".topbar").height();
                let m = Math.sqrt(dx*dx + dy*dy);

                if (m < 24) {
                    secondHeld = i;
                    break;
                }
            }            

            if (secondHeld == -1) {
                if (tempRender) {
                    transitionRenders[prevRender[0]][prevRender[1]].remove();
                    transitionRenders[prevRender[0]][prevRender[1]] = drawTransition(
                        states[prevRender[0]], states[prevRender[1]], 0, transitions[prevRender[0]][prevRender[1]]
                    );
                    tempRender = null;
                }

                newArrow = drawTransition(states[heldNode], currentPos, 0, "");
            } else {
                if (transitions[secondHeld][heldNode] != "" && heldNode != secondHeld) {
                    tempRender = transitionRenders[secondHeld][heldNode].remove();
                    prevRender = [secondHeld, heldNode];

                    newArrow = drawTransition(states[heldNode], states[secondHeld], 10, "", false);
                    transitionRenders[secondHeld][heldNode] = drawTransition(
                        states[secondHeld], states[heldNode], 10, transitions[secondHeld][heldNode], true
                    );
                    
                } else {
                    newArrow = drawTransition(states[heldNode], states[secondHeld], 0, "");
                }
            }
        }
    }

    getTransitions(currentFA);
}, false);

let heldNode = -1;

function deleteObj() {
    if (contextSelectorNode != -1) {
        currentFA.removeState(contextSelectorNode);
        
        states.splice(contextSelectorNode, 1);

        renders[contextSelectorNode].remove();
        // renders.splice(contextSelectorNode, 1);

        getTransitions(currentFA);
        drawGraph(states, transitions);
    } else if (contextSelectorEdge[0] != -1) {
        for (let c of Array.from(currentFA.alphabet).concat([''])) {
            currentFA.removeTransition(contextSelectorEdge[0], contextSelectorEdge[1], c);
        }
        getTransitions(currentFA);
        drawGraph(states, transitions);
    }
}

$("#delete-button-ctx").on("click", () => {
    deleteObj();
});

$("#transition-button-ctx").on("click", () => {
    if (contextSelectorEdge[0] != -1) {
        let cs = window.prompt("enter a character/characters to transition on (use commas if multiple). Use /e for epsilon", transitions[contextSelectorEdge[0]][contextSelectorEdge[1]].replaceAll(/ε/g, "/e"));
        
        let i = 0
        for (let c of currentFA.alphabet.split('').concat('')) {
            currentFA.removeTransition(contextSelectorEdge[0], contextSelectorEdge[1], c);
        }

        while (i < cs.length) {
            let c = cs[i];

            if (c == ',' || c == ' ') {
                i++;
                continue;
            }

            if (c == '/' && i < cs.length-1 && cs[i+1] == 'e') {
                i++;
                c = '';
            }

            currentFA.addTransition(contextSelectorEdge[0], contextSelectorEdge[1], c);
            i++;
        }
        getTransitions(currentFA);
        drawGraph(states, transitions);
    }
});


$("body").on("click", () => {
    contextMenuToggle = false;
    contextMenu.hide();
});

$(".canvas").bind("mousedown", e => {
    if (e.button != 0)
        return;
    
    if (new Set(Array.from($(".context-list"))).has(e.target)) {
        return;

    } else if (contextMenuToggle) {
        contextMenuToggle = false;
        contextMenu.hide();
        contextSelectorNode = -1
    }


    let x = e.clientX-155;
    let y = e.clientY-$(".topbar").height();

    for (let i = 0; i < states.length; i++) {
        let dx = states[i].x-x;
        let dy = states[i].y-y;
        let m = Math.sqrt(dx*dx + dy*dy);
        
        if (m < 24) {
            heldNode = i;
            currentPos = {
                x: states[heldNode].x,
                y: states[heldNode].y
            };
            return;
        }
    }
    heldNode = -1;
});

$(".canvas").bind("mouseup", e => {
    if (secondHeld != -1 && !transitions[heldNode][secondHeld]) {
        let cs = window.prompt("enter a character/characters to transition on (use commas if multiple). Use /e for epsilon");
        let i = 0
        while (i < cs.length) {
            let c = cs[i];

            if (c == ',') {
                i++;
                continue;
            }

            if (c == '/' && i < cs.length-1 && cs[i+1] == 'e') {
                i++;
                c = '';
            }

            if (!currentFA.alphabet.includes(c))
                currentFA.addToAlphabet(c);

            currentFA.addTransition(heldNode, secondHeld, c);
            i++;
        }
        getTransitions(currentFA);  
        drawGraph(states, transitions);
    }
    secondHeld = -1;
    heldNode = -1;
});


$("#execute-button").on("click", ()=>{
    window.alert(currentFA.run(
        $("#string-box").val()
    ));
});

const contextMenu = $("#context-menu");
var contextMenuToggle = false;
var contextSelectorNode = -1;
var contextSelectorEdge = [-1,-1];

$(".canvas").bind("contextmenu", e => {
    e.preventDefault();
    contextMenuToggle = true;
    contextMenu.show();
    contextMenu.css("left", e.pageX-$(".leftbar").width() + 'px');
    contextMenu.css("top", e.pageY-$(".topbar").height() + 'px');

    let x = e.clientX-155;
    let y = e.clientY-$(".topbar").height();

    for (let i = 0; i < states.length; i++) {
        let dx = states[i].x-x;
        let dy = states[i].y-y;
        let m = Math.sqrt(dx*dx + dy*dy);
        
        if (m < 24) {
            contextSelectorNode = i;
            return;
        }
    }

    contextSelectorNode = -1;

    for (let i = 0; i < states.length; i++) {
        for (let j = 0; j < states.length; j++) {
            if (transitions[i][j] != "") {
                if (i != j) {
                    let dx = x-(states[i].x+states[j].x)/2;
                    let dy = y-(states[i].y+states[j].y)/2;

                    let vState = [states[i].x-states[j].x, states[i].y-states[j].y];

                    let angleArrow = Math.atan2(vState[1], vState[0])+Math.PI/2;

                    let lx = dx*Math.cos(angleArrow) + dy*Math.sin(angleArrow);
                    let ly = -dx*Math.sin(angleArrow) + dy*Math.cos(angleArrow);

                    let dState = Math.sqrt(vState[0]*vState[0] + vState[1]*vState[1]);

                    if (Math.abs(lx) < 10 && Math.abs(ly) < dState/2) {
                        contextSelectorEdge = [i,j];
                        return;
                    }
                } else {
                    if (x > states[i].x-17 && y < states[i].y && x < states[i].x+17 && y > states[i].y-50) {
                        contextSelectorEdge = [i,j];
                        return;
                    }
                }
            }
        }
    }

    contextSelectorEdge = [-1,-1];
});

two.update();
two.bind("update", function(frameCount) {
    // if (heldNode != -1) {
    //     states[heldNode].x += mouse[0]*two.width/window.innerWidth;
    //     states[heldNode].y += mouse[1]*two.height/window.innerHeight;
    //     renders[heldNode].translation.x += mouse[0]*two.width/window.innerWidth;
    //     renders[heldNode].translation.y += mouse[1]*two.height/window.innerHeight;
    // }
    // if (transitionRenders[i][i] != undefined) {
    //     transitionRenders[i][i].translation.x = mouse[0]-$(window).width()/1.825;
    //     transitionRenders[i][i].translation.y = mouse[1]-$(window).height()/4;
    // }
}).play();

// two.update()