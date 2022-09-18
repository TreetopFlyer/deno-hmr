import React from "react";

const CompBase =(props)=>
{
    return <p>base component</p>;
};

const CompModified =(props)=>
{
    return <h2>base component</h2>;
};

//type binding = [number, React.Dispatch<React.SetStateAction<number>>];
type binding = ()=>JSX.Element;
const dispatcher:Set<binding> = new Set();
const listen =(inState:binding)=>
{
    dispatcher.add(inState);
};
const dispatch =()=>
{
    console.log("dispatching");
    for(const handler of dispatcher)
    {
        handler();
    }
}
let Active = CompBase;
let count = 0;
const timer = setInterval(()=>
{
    count ++;
    Active = (Active == CompBase) ? CompModified : CompBase;
    dispatch();

    if(count > 5)
    {
        clearInterval(timer);
    }
}, 2000);


export const Proxy =(props)=>
{
    const binding = React.useState(0);
    React.useEffect(()=>{
        console.log("use effect called");
        listen(binding);
    }, []);

    console.log("rendering Proxy");
    return <div>
        <Active/>
    </div>;
}


/*
export class Proxy extends React.Component
{
    constructor(props)
    {
        super(props);
        listen(this.render);
    }

    componentDidUpdate(prevProps)
    {
        console.log('Current props: ', this.props);
        console.log('Previous props: ', prevProps);
    }

    render()
    {
        console.log("re-render method called", React.createElement(Active, {key:Math.random()}));
        return React.createElement(Active);
    }
}
*/


