function shift(m, k) {
    m.initialState += k;
    for (let i = m.numStates-1; i > 0; i--) {
        if (m.acceptingStates.has(i)) {
            m.acceptingStates.delete(i);
            m.acceptingStates.add(i+k);
        }
        let val = m.transitions.get(i);
        for (let c of m.alphabet.split('').concat([''])) {
            if (!val.has(c))
                continue;

            if (m instanceof NFA) {
                let dests = val.get(c);
                val.set(c, dests.map(x => x+k));
            } else {
                let dest = val.get(c);
                val.set(c, dest+k);
            }
        }
        m.transitions.set(i-1, val);
    }
}

function mapUnion(a, b, typeA, typeB) {
    let c;
    let d;
    
    if (typeA != typeB) {
        if (typeA == "NFA") {
            c = structuredClone(a);
            d = structuredClone(b);
        } else {
            c = structuredClone(b);
            d = structuredClone(a);
        }
    } else {
        c = structuredClone(a);
        d = structuredClone(b);
    }
    
    for (let [k,v] of d.entries()) {
        for (let [k2, v2] of v.entries()) {
            v.set(k2, [v2]);
        }
        c.set(
            k,
            v
        )
    }

    return c;
}

function combineAlphabets(a, b) {
    let s = new Set();
    let c = "";

    for (let chr of a) {
        s.add(chr);
        c += chr;
    }

    for (let chr of b) {
        if (!s.has(chr)) {
            s.add(c);
            c += chr;
        } 
    }

    return c;
}

function union(m, n) {
    /*
     * take two FA and combine them under the union operation, m + n
     */

    if (m instanceof DFA && n instanceof DFA) {
        let mn = complement(
            intersection(
                complement(m),
                complement(n)
            )
        );
        mn.name = `${m.name}⋃${m.name}`;
        return mn;
    }

    let mn = new NFA(
        `${m.name}⋃${n.name}`,
        m.numStates + n.numStates,
        0,
        new Map(),
        m.acceptingStates.union(new Set(Array.from(n.acceptingStates).map(x => x+m.numStates))),
        combineAlphabets(m.alphabet, n.alphabet)
    )

    mn.addState();
    let q0 = mn.numStates-1;
    mn.setInitialState(q0);

    mn.addTransition(q0, m.initialState, '');
    mn.addTransition(q0, m.numStates+n.initialState, '');

    for (let i = 0; i < m.numStates; i++) {
        for (let c of m.alphabet.split('').concat([''])) {
            if (m instanceof NFA) {
                let dests = m.applyRules(i,c);
                for (let dest of dests) {
                    mn.addTransition(i, dest, c);
                }
            } else {
                let dest = m.applyRules(i,c);
                mn.addTransition(i, dest, c);
            }
        }
    }

    for (let i = 0; i < n.numStates; i++) {
        for (let c of n.alphabet.split('').concat([''])) {
            if (n instanceof NFA) {
                let dests = n.applyRules(i,c);
                for (let dest of dests) {
                    mn.addTransition(i+m.numStates, dest+m.numStates, c);
                }
            } else {
                let dest = n.applyRules(i,c);
                mn.addTransition(i+m.numStates, dest+m.numStates, c);
            }
        }
    }

    return mn;
}

function complement(m) {
    /*
     * take an FA and perform complement on it
     * do this by inverting its final and non-final states
     */
    
    let n;
    if (m.type == "NFA") 
        n = determinise(m);
    else
        n = m;

    n.name = `¬${m.name}`;

    for (let i = 0; i < n.numStates; i++) {
        if (n.acceptingStates.has(i)) {
            n.acceptingStates.delete(i);
        } else {
            n.acceptingStates.add(i);
        }
    }

    return n;
}

function intersection(m, n) {
    if (m instanceof NFA || n instanceof NFA) {
        let mn = complement(
            union(
                complement(m),
                complement(n)
            )
        );
        mn.name = `${m.name}∩${n.name}`;
        return mn;
    }

    let pairToLinear = (a,b) => a*m.numStates+b;

    let tf = new Map();
    let acceptingStates = new Set();
    let combined_alphabet = combineAlphabets(m.alphabet, n.alphabet);
    let trashState = null;
    if (m.alphabet != n.alphabet) {
        trashState = m.numStates*n.numStates;
    }

    for (let i = 0; i < m.numStates; i++) {
        for (let j = 0; j < n.numStates; j++) {
            if (m.acceptingStates.has(i) && n.acceptingStates.has(j)) {
                acceptingStates.add(pairToLinear(i,j));
            }
            let s = new Map();

            for (let c of Array.from(combined_alphabet).concat([''])) {
                let dest = trashState;
                if (m.alphabet.includes(c) && n.alphabet.includes(c)) {
                    let qi = m.applyRules(i,c);
                    let qj = n.applyRules(j,c);
                    dest = pairToLinear(qi, qj);
                }
                s.set(
                    c,
                    dest
                );
            }

            tf.set(
                pairToLinear(i,j),
                s
            );
        }
    }

    let mn = new DFA(
        `${m.name}∩${n.name}`,
        m.numStates*n.numStates,
        pairToLinear(m.initialState, n.initialState),
        tf,
        acceptingStates,
        combined_alphabet
    );
    
    if (trashState != null) {
        mn.addState();
    }

    return mn;
}

function difference(m, n) {
    let mn = complement(
        union(
            complement(m),
            n
        )
    );

    mn.name = `${m.name}-${n.name}`;
    return mn;
}

function concatenation(m, n) {
    let mn = null;

    mn = new NFA(
        `${m.name}○${n.name}`,
        m.numStates + n.numStates,
        m.initialState,
        new Map(),
        new Set(Array.from(n.acceptingStates).map(x => x+m.numStates)),
        combineAlphabets(m.alphabet, n.alphabet)
    );

    for (let qf of m.acceptingStates.keys()) {
        mn.addTransition(
            qf,
            n.initialState+m.numStates,
            ''
        );
    }

    for (let i = 0; i < m.numStates; i++) {
        for (let c of m.alphabet.split('').concat([''])) {
            if (m instanceof NFA) {
                let dests = m.applyRules(i,c);
                for (let dest of dests) {
                    mn.addTransition(i, dest, c);
                }
            } else {
                let dest = m.applyRules(i,c);
                mn.addTransition(i, dest, c);
            }
        }
    }
    
    for (let i = 0; i < n.numStates; i++) {
        for (let c of n.alphabet.split('').concat([''])) {
            if (n instanceof NFA) {
                let dests = n.applyRules(i,c);
                for (let dest of dests) {
                    mn.addTransition(i+m.numStates, dest+m.numStates, c);
                }
            } else {
                let dest = n.applyRules(i,c);
                mn.addTransition(i+m.numStates, dest+m.numStates, c);
            }
        }
    }

    return mn;
}

function determinise(nfa) {
    dfa = new DFA(nfa.name+" (DFA)");

    if (nfa.numStates == 0)
        return nfa;

    let stateMap = new Map();
    let states = [[nfa.initialState]];

    dfa.addState();
    stateMap.set("", 0);

    dfa.alphabet = nfa.alphabet;
    for (let c of nfa.alphabet) {
        dfa.addTransition(0,0,c);
    }
    
    let qs = states.pop();
    let qns = qs.slice();
    for (let qi of qs) {
        let qes = nfa.applyRules(qi, '');
        for (let qe of qes) {
            if (!qns.includes(qe))
                qns.push(qe);
        }
    }

    states = [qns];
    dfa.addState();
    stateMap.set(qns+"",1)

    while (states.length > 0) {
        qs = states.pop();
        
        for (let c of nfa.alphabet) {
            qns = [];
            for (let qi of qs) {
                let qts = nfa.applyRules(qi, c);
                for (let qt of qts) {
                    if (!qns.includes(qt))
                        qns.push(qt);
                }
            }

            for (let qi of qns.slice()) {
                let qes = nfa.applyRules(qi, '');
                for (let qe of qes) {
                    if (!qns.includes(qe))
                        qns.push(qe);
                }
            }

            if (stateMap.has(qns+"")) {
                dfa.addTransition(stateMap.get(qs+""), stateMap.get(qns+""), c);
            } else {
                dfa.addState();
                stateMap.set(qns+"", dfa.numStates-1);
                dfa.addTransition(stateMap.get(qs+""), dfa.numStates-1, c);
                
                for (let qi of qns) {
                    if (nfa.isFinal(qi)) {
                        dfa.addAcceptingState(dfa.numStates-1);
                        break;
                    }
                }

                states.push(qns);
            }
        }
    }

    dfa.setInitialState(1);
    return dfa;
}

function DFAtoNFA(fa) {
    nfa = new NFA(fa.name, fa.numStates, fa.initialState);
    nfa.acceptingStates = fa.acceptingStates;
    nfa.alphabet = fa.alphabet;

    transition_map = new Map();

    for (let i = 0; i < fa.numStates; i++) {
        let m = new Map();
        for (let c of fa.alphabet) {
            m.set(c, [
                fa.applyRules(i,c)
            ]);
        }
        transition_map.set(i, m);
    }

    nfa.transitions = transition_map;

    return nfa;
}

function star(fa) {
    // enumerate the final states and connect the arrows to a new initial state 
    // which connects to the first via an e-transition
    // Do not bother to keep it closed under DFA
    if (fa instanceof DFA) {
        fa = DFAtoNFA(fa);
    }

    fa = structuredClone(fa);
    fa = Object.assign(new NFA(),fa);

    let new_q0 = fa.numStates;
    fa.addState();
    fa.addTransition(new_q0, fa.initialState, '');
    for (let qf of fa.acceptingStates) {
        fa.addTransition(qf, new_q0, '')
    }
    
    fa.addAcceptingState(new_q0);
    fa.initialState = new_q0;

    return fa;
}

function plus(fa) {
    // enumerate the final states and connect the arrows to the initial state
    if (fa instanceof DFA) {
        fa = DFAtoNFA(fa);
    }

    fa = structuredClone(fa);
    fa = Object.assign(new NFA(),fa);

    let new_q0 = fa.numStates;
    fa.addState();
    fa.addTransition(new_q0, fa.initialState, '');
    for (let qf of fa.acceptingStates) {
        fa.addTransition(qf, new_q0, '')
    }
    
    fa.initialState = new_q0;

    return fa;
}

function applyUnary(operation) {
    let successfulSave = saveFA(currentFA);
    
    if (!successfulSave)
        return;

    setCurrentFA(
        operation(currentFA)
    );
}

function applyBinary(fa, operation) {
    setCurrentFA(
        operation(currentFA, fa)
    );
}

function getChoice(operation) {
    let successfulSave = saveFA(currentFA);
    
    if (!successfulSave)
        return;

    let applyBinaryOperation = (fa) => {
        applyBinary(fa, operation);
    }

    createModal("Combine with...");
    for (let i = 0; i < localStorage.length; i++) {
        let fa_name = localStorage.key(i);
        let type = JSON.parse(localStorage.getItem(fa_name)).type;
        createFA_HTMLBlock(fa_name, type, applyBinaryOperation);
    }
}