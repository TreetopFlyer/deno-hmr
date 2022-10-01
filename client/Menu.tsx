import React, { createContext, useState, useEffect, useLayoutEffect, useRef, useContext } from "react";

export const ContextMenu = createContext({ depth: 0, done: true, open: true });

export function useCollapse(inRef:React.MutableRefObject<null|HTMLElement>, inDefault?:boolean):[open:boolean, setter:(inValue:boolean)=>void, done:boolean] {
    const [openGet, openSet] = useState(inDefault||false);
    const [doneGet, doneSet] = useState(true);
    const endHandler = (e:TransitionEvent) => {
        if (e.target !== inRef.current || e.propertyName !== "height") {
            return;
        }
        if (openGet && inRef.current) {
            inRef.current.style.height = "";
        }
        e.target.clientHeight; // this property access in necessary to prevent instant collapse (not sure why)
        doneSet(true);
    };
    const updater = (inMode:boolean) => {
        console.log(inMode);
        if (inRef.current) {
            inRef.current.style.height = inRef.current.clientHeight + "px";
        }
        openSet(inMode == null ? !openGet : inMode);
        doneSet(false);
    };
    useEffect(() =>
    {
        if(inRef && inRef.current)
        {
            inRef.current.addEventListener("transitionend", endHandler);
            inRef.current.style.height = (openGet ? inRef.current.scrollHeight : 0) + "px";
            return () => inRef.current.removeEventListener("transitionend", endHandler);
        }
    }, [openGet]);
    return [openGet, updater, doneGet];
}

export function useAway(inRef:React.MutableRefObject<null|HTMLElement>, inHandler:()=>void) {
    useLayoutEffect(() => {
        const handleClick = (e) => {
            if (!inRef.current?.contains(e.target)) {
                inHandler();
            }
        };
        document.addEventListener("click", handleClick);
        return () => document.removeEventListener("click", handleClick);
    });
}

export const Menu = ({className, buttonText, children}:{className?:string, buttonText:string, children:React.ReactNode}) =>
{
    const refMenu = useRef(null);
    const refBranch = useRef(null);

    const contextMenu = useContext(ContextMenu);
    const [menuGet, menuSet, doneGet] = useCollapse(refMenu);
    useAway(refBranch, () => {
        if (contextMenu.open && menuGet) {
            menuSet(false);
        }
    });
/*
    if (contextMenu.done && !contextMenu.open) {
        
        styleMenuInstant = css`
            transition: all 0.2s;
        `;
        
        menuSet(false);
    }*/

    return <div className={className} ref={refBranch}>
        <div className={"button"} onClick={(e) => menuSet(!menuGet)} data-open={menuGet}>
            {buttonText} {contextMenu.depth}
            <span>done {doneGet ? `yes` : `no`}</span>
        </div>
        <div ref={refMenu} className={`menu transition-all overflow-hidden border(2 black) ${menuGet ? "opacity-100 h-auto" : "opacity-0 h-0"}`}>
            <ContextMenu.Provider value={{ depth: contextMenu.depth + 1, done: doneGet, open: menuGet }}>
                {children}
            </ContextMenu.Provider>
        </div>
    </div>;
};

/*

<div>
    <Menu button="toggle">
        <p>leaf 1</p>
        <Menu button="toggle">
            <p>leaf 3</p>
            <p>leaf 4</p>
        </Menu>
        <p>leaf 2</p>
    </Menu>
</div>
*/