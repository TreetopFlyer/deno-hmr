import React from "react";

export default (props)=>
{
    const [countGet, countSet] = React.useState(0);
    return <div>
        <p className="p-4 bg-green-500 text-white" onClick={e=>countSet(countGet+1)}>
        thing? {countGet}
    </p>
    <span>prox:{props.prox??""}</span>
    </div>;
}