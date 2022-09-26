import React from "react";
import Search from "./Search.tsx";
import { useMetas, useRoute, useFetch, Switch, Case, Metas } from "amber";
import Blog from "./Blog.tsx";

export default ()=>
{   
    const [route] = useRoute();

    return <div>

        <nav className="flex gap-2">
            <a className="px-4 py-1 bg-black rounded-full text-white" href="/">home</a>
            <a className="px-4 py-1 bg-black rounded-full text-white" href="/about">about</a>
            <a className="px-4 py-1 bg-black rounded-full text-white" href="/blog">blog</a>
        </nav>

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
                <>
                    <Metas title="LE Bloge??" />
                    <Blog/>
                </>
            </Case>
            <Case>
                <p className="text-lg text-red-500">404!</p>
            </Case>
        </Switch>

    </div>;
};