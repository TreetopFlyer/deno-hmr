import React from "react";

export const Collapse =({open, instant, className, children}:{open:boolean, instant:boolean, className?:string, children:React.ReactNode})=>
{
    const [heightGet, heightSet] = React.useState(open ? "auto" : "0px");
    const [clipGet, clipSet] = React.useState(open ? "visible" : "hidden");
    const [movingGet, movingSet] = React.useState(false);
    const container = React.useRef(null);
    const style = {
        height: heightGet,
        overflow: open ? "visible" : "hidden",
        transition: "height 1.0s"
    };
    console.log(`initial hieght would be ${open ? "auto" : "0px"} instead its ${heightGet} because transition is ${movingGet}`);


    const handleRun =()=>
    {
        //console.log("anim start");
    }
    const handleEnd =()=>
    {
        //console.log("anim stop");
        movingSet(false);
        
        if(container.current)
        {
            const el = container.current as Element;
            //clipSet(open ? "visible" : "hidden");
            el.style.overflow = open ? "visible" : "hidden";
            
            if(open)
            {
                el.style.height = "auto";
                //heightSet("auto");
            }
        }

    }

    React.useEffect(()=>{
        if(container.current)
        {
            const el = container.current as Element;
            //console.log(el.scrollHeight);
            el.addEventListener("transitionrun", handleRun);
            el.addEventListener("transitionend", handleEnd);
            
            movingSet(true);
            el.style.overflow = "hidden";

            if(!open)
            {
                //console.log("closing")
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
            else
            {
                //console.log("opening");
                el.style.height = el.scrollHeight+"px";
            }

            return function()
            {
                el.removeEventListener("transitionrun", handleRun);
                el.removeEventListener("transitionend", handleEnd);
            };
        }

    }, [open, children])
    return <div ref={container} style={style} className={className}>
        {children}
    </div>
}