import React from "react";

type AdjustEvent = "CollapseAdjust"
type AdjustEventOptions = {bubbles:boolean, detail:number};

const CTX = React.createContext({Adjust:(inAmount:number)=>{console.log(`at root ${inAmount}`)}});

export default ({children, open, instant}:{children:React.ReactNode, open:boolean, instant:boolean})=>
{
    const Context = React.useContext(CTX);
    const ref = React.useRef(null as null|HTMLDivElement);
    const [initGet] = React.useState(open?{}:{height:"0px"});
    const [doneGet, doneSet] = React.useState(true);

    const DoneHandler = (inEvent:TransitionEvent)=>
    {
        if(inEvent.target == ref.current && inEvent.propertyName == "height")
        {
            doneSet(true);
        }
    }

    React.useEffect(()=>
    {
        if(ref.current)
        {
            ref.current.addEventListener("transitionend", DoneHandler);
            return ()=> {if(ref.current){ ref.current.removeEventListener("transitionend", DoneHandler); }};
        }
    }
    , []);

    React.useEffect(()=>
    {
        if(ref.current)
        {
            if(!doneGet) // interrupted transition
            {
                ref.current.style.height = (open ? ref.current.scrollHeight : 0) + "px";
            }
            if(doneGet && open) // from standing closed
            {
                doneSet(false);
                ref.current.style.height = ref.current.scrollHeight + "px";
            }
            if(doneGet && !open) // from standing open
            {
                doneSet(false);
                ref.current.style.height = ref.current.clientHeight + "px";
                setTimeout(()=>{
                    if(ref.current)
                    {
                        ref.current.style.height = "0px";
                    }
                });
            }

            Context.Adjust(open ? ref.current.scrollHeight : -ref.current.scrollHeight);
        }
    }
    , [open]);


    const AdjustActive =(inAmount:number)=>{
        if(ref.current)
        {
            console.log(`Adjust! amount:${inAmount}`);
            const height = parseInt(ref.current.style.height);
            ref.current.style.height = `${height + inAmount}px`;
            Context.Adjust(inAmount);
        }

    };
    const AdjustSpoof =(inAmount:number)=>{};
    React.useEffect(()=>
    {
        if(ref.current && doneGet && open)
        {
            ref.current.style.height = "";
        }
    }
    , [doneGet]);


    return <div ref={ref} style={{...initGet, transition:"all 3s"}} className="bg-red-500 transition-all duration-1000 overflow-hidden box-border">
        <CTX.Provider value={{Adjust:doneGet ? AdjustSpoof : AdjustActive}}>{children}</CTX.Provider>
    </div>;
};