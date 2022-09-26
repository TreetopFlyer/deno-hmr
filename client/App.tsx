import React from "react";
import Search from "./Search.tsx";
import { useMetas, useRoute, IsoContext, Switch, Case } from "amber";

export default ()=>
{   
    const metas = useMetas({Title:"Amber App"});  
    const [route] = useRoute();

    return <div>
        <nav className="flex gap-10">
            <a href="/home">home!</a>
            <a href="/page1">page1</a>
        </nav>

        <Switch value={route}>
            <Case value="/home">
                <p>home page!!!</p>
            </Case>
            <Case value="/page1">
                <Search/>
            </Case>
            <Case>
                <p className="text-lg text-red-500">404!</p>
            </Case>
        </Switch>

    </div>;
};