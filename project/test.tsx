import React from "https://esm.sh/react@18.2.0";



export default "A VALUE!";

export const Clicker =()=>
{
    const [countGet, countSet] = React.useState(4);

    return <div>
        <p>click 1:</p>
        <button onClick={e=>countSet(countGet+1)}>{countGet}</button>
    </div>;
};