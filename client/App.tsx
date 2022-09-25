import React from "react";
import Deep from "./Deep.tsx"; 
import Search from "./Search.tsx";
import { useMetas, useRoute, IsoContext, Switch, Case } from "amber";
import Thing from "./Thing.tsx";

const ShowStack =()=>
{
    const [state, dispatch] = React.useContext(IsoContext);
    const [displayGet, displaySet] = React.useState(<ul>default</ul>);

    return <ul>
    {
        state.MetaStack.map( meta=>
        {
        return <li>
            <strong className="font-black">{meta.ID}</strong>
            <span>{JSON.stringify(meta.Meta)}</span>
        </li>
        })
    }
</ul>;
}

export default ()=>
{   
    const metas = useMetas({Title:"Amber App"});
    const [countGet, countSet] = React.useState(-10);
    const [route] = useRoute();

    console.log("app rendered!");

    return <div>
        <nav className="flex gap-10">
            <a href="/home">home</a>
            <a href="/page1">page1</a>
        </nav>
        <button className="p-2 bg-black text-white" onClick={e=>countSet(countGet+1)}>app count is: {countGet}</button>
        
        {route.Parts[0] == "home" && <p>home page!</p>}
        {route.Parts[0] == "page1" && <Search/>}

    </div>;
};