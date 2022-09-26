import React from "react";
import { Metas, usePath, Switch, Case } from "../source/client.tsx";

export default ()=>
{
    const {Base} = usePath();
    return <div>
        <h1 className="border-b p-4 ">Blog</h1>
        <nav>
            <a href={Base}>Blog home</a>
            <a href={Base+"/post1"}>Post 01</a>
            <a href={Base+"/post2"}>Post 02</a>
        </nav>
        <Switch>
            <Case value="/:slug">
                a specific blog
            </Case>
            <Case>
                Welcome to the blog!
            </Case>
        </Switch>
    </div>
}