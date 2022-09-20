import React from "react";
import Deep from "./Deep.tsx"; 
import { useMetas } from "amber";

export default ()=>
{   
    useMetas({Title:"Amber App"})
    const [countGet, countSet] = React.useState(2);
    return <div>
        <div className="border-4 no-t">
            <button onClick={()=>countSet(countGet+1)}>count is: {countGet}</button>
        </div>
        <Deep/>
    </div>;
};