import React from "react";

export default ({children, open, instant}:{children:React.ReactNode, open:boolean, instant:boolean})=>
{
    const ref = React.useRef(null as null|HTMLDivElement);
    const [doneGet, doneSet] = React.useState(true);
    const [styleGet, styleSet] = React.useState({height:""});

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
    }, []);

    React.useEffect(()=>
    {
        if(ref.current)
        {
            if(!doneGet || (!open && doneGet))
            {
                ref.current.style.height = ref.current.clientHeight + "px";
            }
            console.log("open use effect called (about to set style)")
            styleSet({height:(open ? ref.current.scrollHeight : 0) + "px"});
            doneSet(false);
        }
    }, [open]);

    React.useEffect(()=>
    {
        if(ref.current && doneGet && open)
        {
            ref.current.style.height = "";
        }
    }, [doneGet]);

    console.log("render called (using style)")
    return <div ref={ref} style={styleGet} className="bg-red-500 transition-all duration-1000 overflow-hidden box-border">{children}</div>;
};