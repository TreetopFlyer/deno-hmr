import React from "react";
import Deep from "./Deep.tsx"; 
import { useMetas, useRoute, IsoContext, Switch, Case } from "amber";

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
    const [countGet, countSet] = React.useState(2);
    const [route] = useRoute();

    return <div>
        <ShowStack/>
        <h1 className="p-4 text-xl">{metas.Title}</h1>
        <div className="border-4 no-t">
            <button onClick={()=>countSet(countGet+1)}>count is: {countGet}</button>
        </div>
        <Deep/>
    </div>;
};