import React from "react";
import { useRoute, Switch, Case, Metas } from "amber";
import Blog from "./Blog.tsx";
import Nav from "./Nav.tsx";

export default ()=>
{   
    const [route] = useRoute();

    return <div className="bg-denim">

        <h1 className="text-md p-20 font-sans text-white opacity-80 uppercase font-black">
            Website
        </h1>

        <Nav/>

        <Metas title="A Website"/>

        <Switch>
            <Case value="/">
                <p>home page!!!</p>
                <button>oh no</button>
            </Case>
            <Case value="/about">
                <Metas title="About" />
                <p>about page</p>
            </Case>
            <Case value="/blog">
                <Blog/>
            </Case>
            <Case>
                <p className="text-lg text-red-500">404!</p>
            </Case>
        </Switch>

    </div>;
};