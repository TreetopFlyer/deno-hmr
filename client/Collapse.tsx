import React from "react";

export const useScreenSize =(inSize:number)=>
{
    const [sizeGet, sizeSet] = React.useState(window.innerWidth > inSize);

    React.useEffect(()=>{
        let debounce = false;
        let size = window.innerWidth;
        let dirty = false;

        const bounce =()=>
        {
            debounce = true;
            setTimeout(() => {
                if(dirty)
                {
                    sizeSet(size > inSize);
                    bounce();
                }
                else
                {
                    dirty = false;
                    debounce = false;
                }
            }, 500);
        };
        const resize =()=>
        {
            size = window.innerWidth;
            debounce ? dirty = true : bounce();
        };

        window.addEventListener("resize", resize);
        return ()=>window.removeEventListener("resize", resize);

    }, []);
    return sizeGet;
};

type BranchState = [open:boolean, instant:boolean, threshold:boolean];
const CTXBranch = React.createContext([ [true, false, true], (arg)=>{}] as [BranchState, React.Dispatch<React.SetStateAction<BranchState>>])
const CTXMenu = React.createContext(
    {
        Adjust:(inAmount:number)=>{},
        Done:true,
        Open:true
    }
);

export const Branch =({children, open, away, style, className}:{children:React.ReactNode, open?:boolean, away?:boolean, style?:Record<string, string>, className?:string})=>
{
    /// BranchState
    const binding = React.useState([open??false, false, open??false] as BranchState);
    const ref = React.useRef(null as null|HTMLDivElement);

    React.useEffect(()=>
    {
        if(away)
        {
            const handler = (inEvent:MouseEvent) =>
            {
                if(ref.current && !ref.current.contains(inEvent.target))
                {
                    /// BranchState
                    binding[1]([false, false, binding[0][2]]);
                }
            }
            document.addEventListener("click", handler);
            return () => document.removeEventListener("click", handler);
        }
    }, []);

    return <div ref={ref} style={style} className={className}>
        <CTXBranch.Provider value={binding}>
            {children}
        </CTXBranch.Provider>
    </div>
};

export const BranchButton =({children, style, className, classActive}:{children:React.ReactNode, style?:Record<string, string>, className?:string, classActive?:string})=>
{
    /// BranchState
    const [openGet, openSet] = React.useContext(CTXBranch);
    let classes = className;
    if(openGet[0]){ classes += " " + classActive??"" }
    return <div style={style} onClick={e=>openSet([!openGet[0], false, openGet[2]])} className={ classes }><p>{openGet[0]?"open":"closed"}</p>{children}</div>;
};

export const BranchMenu =({children, style, className}:{children:React.ReactNode, style?:Record<string, string>, className?:string})=>
{
    const ContextMenu = React.useContext(CTXMenu);
    const ContextBranch = React.useContext(CTXBranch);
    const [open, instant] = ContextBranch[0];
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

            console.log(`is isntant?${instant}`)
            if(instant)
            {
                ref.current.style.transition = "none";
                ref.current.style.height = (open ? ref.current.scrollHeight : 0) + "px";
                setTimeout(()=>
                {
                    if(ref.current)
                    {
                        ref.current.style.transition = "";
                    }
                });
                doneSet(true);
                return;
            }
            
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
            /// BranchState
            ContextBranch[1]([false, true, ContextBranch[0][2]]);
        }
    }
    , [ContextMenu.Done, ContextMenu.Open]);

    return <div ref={ref} style={{...initGet, ...style}} className={"transition-all duration-300 overflow-hidden " + className}>
        <CTXMenu.Provider value={{Adjust:doneGet ? (inAmount:number)=>{} : AdjustHandler, Done:doneGet, Open:openGet}}>{children}</CTXMenu.Provider>
    </div>;
};