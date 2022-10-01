import React from "react";

const CTXMenu = React.createContext(
    {
        Adjust:(inAmount:number)=>{},
        Done:true,
        Open:true
    }
);
const CTXBranch = React.createContext([true, (arg)=>{}] as [boolean, React.Dispatch<React.SetStateAction<boolean>>])

export const Button =({children}:{children:React.ReactNode})=>
{
    const [openGet, openSet] = React.useContext(CTXBranch);
    return <div onClick={e=>openSet(!openGet)} className="px-3 py-1 bg-black text(white xs) font-black">{children}</div>
};

export const Branch =({children, open}:{children:React.ReactNode, open?:boolean})=>
{
    const binding = React.useState(open??false);
    return <CTXBranch.Provider value={binding}>
        {children}
    </CTXBranch.Provider>
};

export const Menu =({children}:{children:React.ReactNode})=>
{
    const ContextMenu = React.useContext(CTXMenu);
    const ContextBranch = React.useContext(CTXBranch);
    const open = ContextBranch[0];
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
            ContextMenu.Adjust(inAmount);
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

            ContextMenu.Adjust(open ? ref.current.scrollHeight : -ref.current.scrollHeight);
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
        if(ContextMenu.Done && !ContextMenu.Open)
        {
            console.log(`--- crush ---`)
            ContextBranch[1](false)
        }
    }
    , [ContextMenu.Done, ContextMenu.Open])

    return <div ref={ref} style={{...initGet, transition:"all 0.5s"}} className="bg-red-500 transition-all duration-1000 overflow-hidden box-border">
        <CTXMenu.Provider value={{Adjust:doneGet ? (inAmount:number)=>{} : AdjustHandler, Done:doneGet, Open:openGet}}>{children}</CTXMenu.Provider>
    </div>;
};