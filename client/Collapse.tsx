import React from "react";

export const useScreenSize =(inSize:number)=>
{
    const [sizeGet, sizeSet] = React.useState(false);

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

        sizeSet(size > inSize);
        window.addEventListener("resize", resize);
        return ()=>window.removeEventListener("resize", resize);

    }, []);
    return sizeGet;
};

type BranchState = {open:boolean, instant:boolean, threshold:boolean, check:(inTarget:HTMLAnchorElement)=>boolean, away:boolean};
const CTXBranch = React.createContext([ {open:true, instant:false, threshold:true, check:(inTarget)=>false, away:false}, (arg)=>{}] as [BranchState, React.Dispatch<React.SetStateAction<BranchState>>])
const CTXMenu = React.createContext(
    {
        Adjust:(inAmount:number)=>{},
        Done:true,
        Open:true
    }
);

export const Branch =({children, open, away, style, className, id}:{children:React.ReactNode, open?:boolean, away?:boolean, style?:Record<string, string>, className?:string, id?:string})=>
{
    const [Parent] = React.useContext(CTXBranch);
    const ref = React.useRef(null as null|HTMLDivElement);

    const binding = React.useState({
        open:open??false,
        instant:false,
        threshold:open??false,
        check(inTarget)
        {
            return ref.current?.contains(inTarget)
        },
        away
    } as BranchState);


    React.useEffect(()=>
    {
        if(away)
        {
            const handler = (inEvent:MouseEvent) =>
            {
                const target = inEvent.target as HTMLAnchorElement;
                if(ref.current && (!ref.current.contains(target) || target.href ))
                {
                    // about to close due to click outside.
                    // but first, check if there's a parent that also contians the target
                    if(Parent.away && !Parent.check(target))
                    {
                        console.log(`${id}: Away, parent should collapse`)
                        return;
                    }
                    else
                    {
                        console.log(`${id}: Away, ill collapse`)
                        binding[1]({...binding[0], open:false, instant:false});
                    }
                }
            }
            document.addEventListener("click", handler);
            return () => document.removeEventListener("click", handler);
        }
    }, [away]);

    React.useEffect(()=>
    {
        binding[1]({...binding[0], open:open??false});
    }, [open])

    return <div ref={ref} style={style} className={className}>
        <CTXBranch.Provider value={[{...binding[0], away:away??false}, binding[1]]}>
            {children}
        </CTXBranch.Provider>
    </div>;
};

export const BranchButton =({children, style, className, classActive}:{children:React.ReactNode, style?:Record<string, string>, className?:string, classActive?:string})=>
{
    /// BranchState
    const [branchGet, branchSet] = React.useContext(CTXBranch);
    let classes = className;
    if(branchGet.open){ classes += " " + classActive??"" }
    return <div style={style} onClick={e=>branchSet({...branchGet, instant:false, open:!branchGet.open})} className={ classes }><p>{branchGet.open?"open":"closed"}</p>{children}</div>;
};


export const BranchMenu =({children, style, className}:{children:React.ReactNode, style?:Record<string, string>, className?:string})=>
{
    const ContextMenu = React.useContext(CTXMenu); // used to send adjust signals up
    const [branchGet, branchSet] = React.useContext(CTXBranch); // used to send instant collapse signals down
    
    const ref = React.useRef(null as null|HTMLDivElement);
    const [initGet] = React.useState(branchGet.open?{}:{height:"0px"});
    const [doneGet, doneSet] = React.useState(true);
    const [openGet, openSet] = React.useState(branchGet.open);

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
            console.log(`adjusting`, inAmount);
            ContextMenu.Adjust(inAmount);
        }
    };

    // transition handlers (on mount)
    React.useEffect(()=>
    {
        if(ref.current)
        {
            ref.current.addEventListener("transitionend", DoneHandler);
            return ()=> {if(ref.current){ ref.current.removeEventListener("transitionend", DoneHandler); }};
        }
    }, []);

    // respond to "context prop" changes from <Branch/>
    React.useEffect(()=>
    {
        if(ref.current)
        {
            openSet(branchGet.open);

            if(branchGet.instant)
            {
                ref.current.style.transition = "none";
                ref.current.style.height = (branchGet.open ? ref.current.scrollHeight : 0) + "px";
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
                ref.current.style.height = (branchGet.open ? ref.current.scrollHeight : 0) + "px";
            }
            if(doneGet && branchGet.open) // from standing closed
            {
                doneSet(false);
                ref.current.style.height = ref.current.scrollHeight + "px";
            }
            if(doneGet && !branchGet.open) // from standing open
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

            ContextMenu.Adjust(branchGet.open ? ref.current.scrollHeight : -ref.current.scrollHeight);
        }
    }
    , [branchGet.open, branchGet.instant]);

    // clear the height style if an open animation in done
    React.useEffect(()=>
    {
        if(ref.current && doneGet && branchGet.open)
        {
            ref.current.style.height = "";
        }
    }
    , [doneGet]);

    // instant collapse when parent closes
    React.useEffect(()=>
    {
        if(ContextMenu.Done && !ContextMenu.Open)
        {
            /// BranchState
            branchSet({...branchGet, open:false, instant:true});
        }
    }
    , [ContextMenu.Done, ContextMenu.Open]);

    return <div ref={ref} style={{...initGet, ...style}} className={"transition-all duration-300 overflow-hidden " + className} >
        <CTXMenu.Provider value={{Adjust:doneGet ? (inAmount:number)=>{} : AdjustHandler, Done:doneGet, Open:openGet}}>{children}</CTXMenu.Provider>
    </div>;
};