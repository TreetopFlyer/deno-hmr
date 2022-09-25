import React from "react";
import Thing from "./Thing.tsx";

export default ():JSX.Element=>
{
    return <div>
        <input className="border-1 rounded p-1" type="text"/>
        <h2>Le Search</h2>
        <Thing/>
    </div>
}