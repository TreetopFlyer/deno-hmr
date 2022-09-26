import * as ReactParts from "react-alias";

const H = ReactParts.createElement;

const HMR = {
    registered: new Map(),
    states: new Map(),
    statesOld: new Map(),
    reloads: 0,
    wireframe: false
};
HMR.onChange =(key, value)=>
{
    HMR.registered.set(key, value);
};
HMR.update =()=>
{
    HMR.reloads++;
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
        output[key] = val.state+"--"+val.reload;
    }
    console.log(output);
    output = [];
    for(const[key, val] of HMR.states)
    {
        output[key] = val.state+"--"+val.reload;
    }
    console.log(output);
};
HMR.wipe =()=>
{
    HMR.statesOld = new Map();
};

const MapAt =(inMap, inIndex)=>
{
    let index = 0;
    for(const kvp of inMap)
    {
        if(index == inIndex)
        {
            return kvp;
        }
        index++;
    }
    return false;
}

window.HMR = HMR;

const ProxyElement = (props)=>
{
    const [stateGet, stateSet] = ReactParts.useState(0);
    ReactParts.useEffect(()=>HMR.onChange( ()=>stateSet(stateGet+1), "ProxyElement" ));

    const child = H(...props.__args);

    if(HMR.wireframe)
    {
        return H("div", {style:{padding:"10px", border:"2px solid red"}},
            H("p", null, stateGet),
            child
        );
    }
    else
    {
        return child;
    }
};

const ProxyCreate =(...args)=>
{
    return typeof args[0] != "string" ? H(ProxyElement, {__args:args, ...args[1]}) : H(...args);
};

const ProxyState =(arg)=>
{
    const id = ReactParts.useId();
    const trueArg = arg;

    // does statesOld have an entry for this state? use that instead of the passed arg
    const check =  MapAt(HMR.statesOld, HMR.states.size);
    if(check)
    {
        arg = check[1].state;
        console.info(`BOOTING with ${arg}`);
    }

    const lastKnowReloads = HMR.reloads;
    const [stateGet, stateSet] = ReactParts.useState(arg);
    ReactParts.useEffect(()=>{
        return ()=>{
            if(HMR.reloads == lastKnowReloads)
            {
                // this is a switch/ui change, not a HMR reload change
                const oldState = MapAt(HMR.statesOld, HMR.states.size-1);
                HMR.statesOld.set(oldState[0], {...oldState[1], state:trueArg});
            }
            HMR.states.delete(id);
        }
    }, []);

    if(!HMR.states.has(id))
    {
        HMR.states.set(id, {state:arg, set:stateSet, reload:HMR.reloads});
    }
    
    function proxySetter (arg)
    {
        //console.log("state spy update", id, arg);
        HMR.states.set(id, {state:arg, set:stateSet, reload:HMR.reloads});
        return stateSet(arg);
    }
    return [stateGet, proxySetter];

};

export * from "react-alias";
export { ProxyCreate as createElement, ProxyState as useState };
export default {...ReactParts.default, createElement:ProxyCreate, useState:ProxyState};