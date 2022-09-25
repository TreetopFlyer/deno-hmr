import * as ReactParts from "react-alias";

const H = ReactParts.createElement;

const HMR = {
    registered: new Map(),
    states: new Map(),
    statesOld: new Map()
};
HMR.onChange =(key, value)=>
{
    console.log("handler registered");
    HMR.registered.set(key, value);
};
HMR.update =()=>
{
    const keys = [];
    for(const [key, value] of HMR.registered){ keys.push(key); }
    HMR.registered.clear();
    HMR.statesOld = HMR.states;
    HMR.states = new Map();
    keys.forEach(k=>k());
    HMR.echoState();
};
HMR.echoState =()=>
{
    let output = [];
    for(const[key, val] of HMR.statesOld)
    {
        output[key] = val.state;
    }
    console.log(output);
    output = [];
    for(const[key, val] of HMR.states)
    {
        output[key] = val.state;
    }
    console.log(output);
};
HMR.recallState =()=>
{
    for(const[key, val] of HMR.states)
    {
        const {state, set} = val;
        set(state);
        console.log(key, "has been set with", state);
    }
};
HMR.indexOnOld =(inIndex)=>
{
    let index = 0;
    for(const kvp of HMR.statesOld)
    {
        if(index == inIndex)
        {
            return kvp;
        }
        index++;
    }
    return false;
};

window.HMR = HMR;

function StateSpy (...ReactCreateArgs)
{
    return H(...ReactCreateArgs);
}

const ProxyElement =(props)=>
{
    const [stateGet, stateSet] = ReactParts.useState(0);
    ReactParts.useEffect(()=>HMR.onChange( ()=>stateSet(stateGet+1), "yep" ));

    return H("div", {style:{padding:"10px", border:"2px solid red"}},
        H("p", null, stateGet),
        //props.children
        StateSpy(...props.args)
    );
};

const ProxyCreate =(...args)=>
{
    return typeof args[0] != "string" ? H(ProxyElement, {args}) : H(...args);
};

const ProxyState =(arg)=>
{
    const check = HMR.indexOnOld(HMR.states.size);
    console.log("checking old value", check);
    if(check)
    {
        arg = check[1].state;
    }

    const id = ReactParts.useId();
    const [stateGet, stateSet] = ReactParts.useState(arg);

    if(!HMR.states.has(id))
    {
        console.log("state spy created", id, arg, "at index", HMR.states.size);
        
        HMR.states.set(id, {state:arg, set:stateSet});
    }
    
    function proxySetter (arg)
    {
        console.log("state spy update", id, arg);
        HMR.states.set(id, {state:arg, set:stateSet});
        return stateSet(arg);
    }
    return [stateGet, proxySetter];

};

export * from "react-alias";
export { ProxyCreate as createElement, ProxyState as useState };
export default {...ReactParts.default, createElement:ProxyCreate, useState:ProxyState};