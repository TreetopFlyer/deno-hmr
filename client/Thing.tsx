import React from "react";

export default ()=>
{
    const [countGet, countSet] = React.useState(0);
    return <p onClick={e=>countSet(countGet+1)}>thing! {countGet}</p>;
}