import React from "react";
import Search from "./Search.tsx";
import { useMetas, useRoute, useFetch, Switch, Case, Metas } from "amber";
import Blog from "./Blog.tsx";
import Collapse from "./Collapse.tsx";

const Branch =()=>
{
    const [openGet, openSet] = React.useState(true);
    return <div>
        <button onClick={e=>openSet(!openGet)}>Click</button>
        <Collapse open={openGet} instant={false}>
            <div>
                JSDoc 3 is an API documentation generator for JavaScript, similar to Javadoc or phpDocumentor.
                You add documentation comments directly to your source code, right alongside the code itself.
                The JSDoc tool will scan your source code and generate an HTML documentation website for you.
            </div>
            <div className="mt-2">
                JSDoc's purpose is to document the API of your JavaScript application or library.
                It is assumed that you will want to document things like modules, namespaces, classes, methods, method parameters, and so on.
            </div>
        </Collapse>
    </div>
}

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

        <Branch/>

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