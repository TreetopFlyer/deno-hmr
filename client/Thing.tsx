import React from "react";

export default ()=>
{
    const [countGet, countSet] = React.useState(0);
    return <p className="p-2 bg-red-500 text-white" onClick={e=>countSet(countGet+1)}>thing??? {countGet}</p>;
}