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

        <button className="p-2 bg-black text-white" onClick={e=>countSet(countGet+1)}>app count {countGet}</button>
        <Search/>

    </div>;
};