import React from "react";
import { Metas, useRoute, usePath, Switch, Case, Path } from "../source/client.tsx";

export default ()=>
{
    const [route] = useRoute();
    const path = usePath();
    return <div>
        <h1 className="border-b p-4 ">Blog</h1>
        <h2>Depth: {path.Depth}</h2>
        <h2>Base: {path.Base}</h2>
        <nav>
            <a href={path.Base}>Blog home</a>
            <a href={path.Base+"/post1"}>Post 01</a>
            <a href={path.Base+"/post2"}>Post 02</a>
        </nav>
        <Switch value={route}>
            <Case value="/:slug">
                a specific blog <Path param="slug" />
            </Case>
            <Case>
                Welcome to the blog!
            </Case>
        </Switch>
    </div>
}