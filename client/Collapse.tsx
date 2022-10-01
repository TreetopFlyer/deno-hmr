import React from "react";
\
const CTX = React.createContext(
    {
        Adjust:(inAmount:number)=>{},
        Done:true,
        Open:true
    }
);

export default ({children, open, instant}:{children:React.ReactNode, open:boolean, instant:boolean})=>
{
    const Context = React.useContext(CTX);
    const ref = React.useRef(null as null|HTMLDivElement);
    const [initGet] = React.useState(open?{}:{height:"0px"});
    const [doneGet, doneSet] = React.useState(true);
    const [openGet, openSet] = React.useState(open);

    const DoneHandler = (inEvent:TransitionEvent)=>
    {
        if(inEvent.target == ref.current && inEvent.propertyName == "height")
        {
            doneSet(true);
        }
    };

    const AdjustHandler =(inAmount:number)=>
    {
        if(ref.current)
        {
            const height = parseInt(ref.current.style.height);
            ref.current.style.height = `${height + inAmount}px`;
            Context.Adjust(inAmount);
        }
    };

    React.useEffect(()=>
    {
        if(ref.current)
        {
            ref.current.addEventListener("transitionend", DoneHandler);
            return ()=> {if(ref.current){ ref.current.removeEventListener("transitionend", DoneHandler); }};
        }
    }, []);

    React.useEffect(()=>
    {
        if(ref.current)
        {
            openSet(open);
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

    React.useEffect(()=>
    {
        if(ref.current && doneGet && open)
        {
            ref.current.style.height = "";
        }
    }
    , [doneGet]);

    React.useEffect(()=>
    {
        if(Context.Done && !Context.Open)
        {
            console.log(`--- crush ---`)
        }
    }
    , [Context.Done, Context.Open])

    return <div ref={ref} style={{...initGet, transition:"all 3s"}} className="bg-red-500 transition-all duration-1000 overflow-hidden box-border">
        <CTX.Provider value={{Adjust:doneGet ? (inAmount:number)=>{} : AdjustHandler, Done:doneGet, Open:openGet}}>{children}</CTX.Provider>
    </div>;
};