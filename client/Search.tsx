import React from "react";
import Thing from "./Thing.tsx";

export default ():JSX.Element=>
{
    return <div>
        <input className="border(2 black) rounded p-2" type="text"/>
        <h2>Le Search!</h2>
        <Thing/>
    </div>
}