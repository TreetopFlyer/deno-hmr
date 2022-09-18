import * as ReactParts from "https://esm.sh/react@18.2.0";

window.HMR = { registered:new Map() };
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
    keys.forEach(k=>k());
};

const ProxyElement =(props)=>
{
    const [stateGet, stateSet] = ReactParts.useState(0);
    ReactParts.useEffect(()=>window.HMR.onChange( ()=>stateSet(stateGet+1), "yep" ));

    return ReactParts.createElement("div", {style:{border:"2px solid red"}},
        ReactParts.createElement("p", null, stateGet),
        ReactParts.createElement(props.children.type, {...props.children.props, _proxy:Math.random()})
    );
};

const ProxyCreate =(...args)=>
{
    console.log("proxy createElement!", typeof args[0] != "string");
    const el = ReactParts.createElement(...args)
    return typeof args[0] != "string" ? ReactParts.createElement(ProxyElement, null, el) : el;
};

export * from "https://esm.sh/react@18.2.0";
export default ReactParts.default;
export { ProxyCreate as createElement };