import React from "react";

export const Collapse =({open, instant, className, children}:{open:boolean, instant:boolean, className?:string, children:React.ReactNode})=>
{
    const [heightGet, heightSet] = React.useState(open ? "auto" : "0px");
    const [movingGet, movingSet] = React.useState(false);
    const container = React.useRef(null);
    const style = { height: heightGet, overflow: open ? "visible" : "hidden", transition: "height 1.0s" };

    const handleEnd =()=>
    {
        movingSet(false);
        if(container.current)
        {
            const el = container.current as Element;
            el.style.overflow = open ? "visible" : "hidden";
            el.style.height = open ? "auto" : "0px";
        }
    };

    React.useEffect(()=>
    {
        if(container.current)
        {
            const el = container.current as Element;
            el.addEventListener("transitionend", handleEnd);
            
            movingSet(true);
            el.style.overflow = "hidden";

            if(open)
            {
                el.style.height = el.scrollHeight+"px";
            }
            else
            {
                if(!movingGet)
                {
                    el.style.transition = "none";
                    el.style.height = el.clientHeight+"px";
                    setTimeout(()=>
                    {
                        el.style.height = "0px";
                        el.style.transition = style.transition;
                    });
                }
                else
                {
                    el.style.height = "0px";
                }
            }

            return ()=> el.removeEventListener("transitionend", handleEnd);
        }

    }, [open, children]);
    
    return <div ref={container} style={style} className={className}>
        {children}
    </div>
}