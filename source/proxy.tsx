import * as ReactParts from "react-alias";

const H = ReactParts.createElement;

window.HMR = {
    registered: new Map(),
    states: new Map()
};
window.HMR.onChange =(key, value)=>
{
    console.log("handler registered");
    window.HMR.registered.set(key, value);
};
window.HMR.update =()=>
{
    const keys = [];
    for(const [key, value] of window.HMR.registered){ keys.push(key); }
    window.HMR.registered.clear();
    window.HMR.echoState();
    keys.forEach(k=>k());
    window.HMR.echoState();
};
window.HMR.echoState =()=>
{
    const output = [];
    for(const[key, val] of HMR.states)
    {
        output[key] = val.state;
    }
    console.log(output);
};
window.HMR.recallState =()=>
{
    for(const[key, val] of HMR.states)
    {
        const {state, set} = val;
        set(state);
        console.log(key, "has been set with", state);
    }
}

function StateSpy (...ReactCreateArgs)
{
    return H(...ReactCreateArgs);
}

const ProxyElement =(props)=>
{
    const [stateGet, stateSet] = ReactParts.useState(0);
    ReactParts.useEffect(()=>window.HMR.onChange( ()=>stateSet(stateGet+1), "yep" ));

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
    const id = ReactParts.useId();
    const [stateGet, stateSet] = ReactParts.useState(arg);

    console.log("state spy created", id, arg);
    if(!window.HMR.states.has(id))
    {
        window.HMR.states.set(id, {state:arg, set:stateSet});
    }
    
    function proxySetter (arg)
    {
        console.log("state spy update", id, arg);
        window.HMR.states.set(id, {state:arg, set:stateSet});
        return stateSet(arg);
    }
    return [stateGet, proxySetter];

};

export * from "react-alias";
export { ProxyCreate as createElement, ProxyState as useState };
export default {...ReactParts.default, createElement:ProxyCreate, useState:ProxyState};