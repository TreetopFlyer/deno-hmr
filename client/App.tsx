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
    const [countGet, countSet] = React.useState(2);
    const [route] = useRoute();

    return <div>
        <a href="/">home</a>
        <a href="/anyhting" className="inline-block mt-2">anything</a>
        <Switch value={route}>
            <Case value="/">
                <div>
                <Thing/>
                </div>
                
            </Case>
            <Case>
                <Search/>
            </Case>
        </Switch>
        
    </div>;
};