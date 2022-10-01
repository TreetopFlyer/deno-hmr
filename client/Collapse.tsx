import React from "react";

export default ({children, open, instant}:{children:React.ReactNode, open:boolean, instant:boolean})=>
{
    const ref = React.useRef(null as null|HTMLDivElement);
    const [doneGet, doneSet] = React.useState(true);
    let initial = false;

    const DoneHandler = (inEvent:TransitionEvent)=>
    {
        if(inEvent.target == ref.current && inEvent.propertyName == "height")
        {
            doneSet(true);
        }
    }

    React.useEffect(()=>
    {
        initial = true;
        if(ref.current)
        {
            console.log(`moiunt effect`);
            ref.current.addEventListener("transitionend", DoneHandler);
            return ()=> {if(ref.current){ ref.current.removeEventListener("transitionend", DoneHandler); }};
        }
    }, []);

    React.useEffect(()=>
    {
        if(ref.current)
        {
            if(initial && open){ return } // initial instant

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
        }
    }, [open]);

    React.useEffect(()=>
    {
        if(ref.current && doneGet && open)
        {
            console.log(`doneGet effect`)
            ref.current.style.height = "";
        }
    }, [doneGet]);


    console.log(`col -- render`);
    return <div>
        <p>{open ? "open" : "closed"}</p>
        <div ref={ref} className="bg-red-500 transition-all duration-1000 overflow-hidden box-border">{children}</div>
    </div>;
};