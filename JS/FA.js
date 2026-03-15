class FA {
    /*
     * name string
     * states int list
     * initialState int
     * acceptingStates int set
     */
    constructor(name, numStates=0, initialState=undefined, acceptingState=[]) {
        this.type = "FA";
        this.name = name;
        this.initialState = initialState;
        this.acceptingStates = new Set(acceptingState);
        this.numStates = numStates;
    }

    addAcceptingState(state) {
        if (state < this.numStates)
            this.acceptingStates.add(state);
    }

    removeAcceptingState(state) {
        if (this.acceptingStates.has(state)) {
            this.acceptingStates.delete(state);
        }
    }

    getAcceptingStates() {
        return new Array(this.acceptingStates);
    }

    isFinal(state) {
        if (this.acceptingStates.has(state))
            return true;
        else
            return false;
    }

    setInitialState(state) {
        if (state < this.numStates)
            this.initialState = state;
    }

    getInitialState() {
        return this.initialState;
    }

    removeState(state) {}

    addState() {
        if (this.numStates++ == 0) {    
            this.setInitialState(0);
        }
    }

    addToAlphabet(c) {
        this.alphabet += c;
    }

    addTransition(src, dest, char) {}
    
    setName(newName) {
        this.name = newName;
    }

    getName() {
        return this.name;
    }

    run(word) {}
}

class DFA extends FA {
    constructor(name, numStates, initialState, transitions=new Map(), acceptingState=new Set(), alphabet="") {
        super(name, numStates, initialState, acceptingState);
        this.type = "DFA";
        this.transitions = transitions;
        this.alphabet = alphabet;
    }

    addTransition(src, dest, char) {
        if (char == '')
            return;

        if (src < this.numStates && dest < this.numStates) {
            if (this.transitions.has(src)) {
                let val = this.transitions.get(src)
                val.set(char,dest);
            } else {
                this.transitions.set(
                    src,
                    new Map([[char, dest]])
                )
            }
        }
    }

    addState() {
        if (this.numStates++ == 0) {    
            this.setInitialState(0);
        }

        for (let c of Array.from(this.alphabet).concat(['']))
            this.addTransition(this.numStates-1, this.numStates-1, c);
    }

    addToAlphabet(c) {
        this.alphabet += c;

        for (let i = 0; i < this.numStates; i++)
            this.addTransition(i,i,c);
    }

    removeState(state) {
        // update states greater than the removed one
        for (let i = state+1; i < numStates; i++) {
            let val = this.transitions.get(i);
            for (let c of this.alphabet) {
                let dest = val.get(c);
                if (dest > state) {
                    dest--;
                } else if (dest == state) {
                    dest = i;
                }
                val.set(c, dest);
            }
            this.transitions.set(i-1, val);
        }
        this.transitions.delete(--this.numStates);
    }

    applyRules(state, char) {
        return this.transitions.get(state).get(char);
    }

    run(word) {
        let currentState = this.initialState;

        for (let c of word) {
            currentState = this.applyRules(currentState, c);
            if (!currentState)
                return false;
        }

        return this.isFinal(currentState)
    }
}

class NFA extends FA {
    constructor(name, numStates, initialState, transitions=new Map(), acceptingState=new Set(), alphabet="") {
        super(name, numStates, initialState, acceptingState);
        this.type = "NFA";
        this.transitions = transitions;
        this.alphabet = alphabet;
    }

    addTransition(src, dest, char) {
        if (src < this.numStates && dest < this.numStates) {
            if (this.transitions.has(src)) {
                let val = this.transitions.get(src);

                let dests = val.get(char);
                
                if (char != '' && !this.alphabet.includes(char))
                    this.addToAlphabet(char);

                if (dests == undefined) {
                    this.transitions.set(
                        src,
                        new Map([[char, [dest]]])
                    )
                    return;
                }
                    
                if (dests.includes(dest))
                    return;


                val.set(char,dests.concat(dest));
            } else {
                this.transitions.set(
                    src,
                    new Map([[char, [dest]]])
                )
            }
        }
    }

    removeTransition(src, dest, char) {
        if (!this.transitions.has(src))
            return;
        
        let val = this.transitions.get(src);

        if (!val.has(char))
            return;

        let dests = val.get(char);
        let i = dests.indexOf(dest);
        dests.splice(i,1)
    }

    removeState(state) {
        // update states greater than the removed one
        for (let i = state+1; i < this.numStates; i++) {
            let val = this.transitions.get(i);

            if (this.isFinal(i)) {
                this.removeAcceptingState(i);
                this.addAcceptingState(i-1);
            }

            if (!val)
                continue;

            for (let c of Array.from(this.alphabet).concat([''])) {
                let dests = val.get(c);
                if (!dests)
                    continue;

                for (let j = 0; j < dests.length; j++) {
                    if (dests[j] > state) {
                        dests[j]--;
                    } else if (dests[j] == state) {
                        dests.splice(j,1);
                    }
                }
                val.set(c, dests);
            }
            this.transitions.set(i-1, val);
        }
        this.transitions.delete(--this.numStates);
    }

    applyRules(state, char) {
        let x = this.transitions.get(state);
        if (!x)
            return []
        
        return x.get(char) || [];

    }
    
    run(word) {
        let q = [[this.initialState, word]];

        while (q.length > 0) {
            let [currentState, word] = q.shift();
            if (word == "") {
                if (this.isFinal(currentState)) {
                    return true;
                } else {
                    continue;
                }
            }

            let c = word[0];

            let transitions = this.applyRules(currentState, c);
            let etransitions = this.applyRules(currentState, '');
            let flag = false;
            for (let state of transitions) {
                let w = word.substring(1);
                
                for (let entry of q) {
                    if (entry[0] == state && entry[1] == w) {
                        flag = true;
                    }
                }
                if (!flag)
                    q.push([state, w]);
                flag = false;
            }

            for (let state of etransitions) {
                for (let entry of q) {
                    if (entry[0] == state && entry[1] == word) {
                        flag = true;
                    }
                }
                if (!flag)
                    q.push([state, word]);
                flag = false;
            }
        }
        return false;
    }
}

var currentFA = new NFA();