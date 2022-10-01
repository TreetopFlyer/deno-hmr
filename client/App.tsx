import React from "react";
import Search from "./Search.tsx";
import { useMetas, useRoute, useFetch, Switch, Case, Metas } from "amber";
import Blog from "./Blog.tsx";
import { Branch, BranchMenu, BranchButton } from "./Collapse.tsx";

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

        <Branch  away={true}>
            <BranchButton>Click a</BranchButton>
            <BranchMenu>
                <Branch>
                    <BranchButton>Click b</BranchButton>
                    <BranchMenu className="bg-red-500">
                        <div>
                            JSDoc 3 is an API documentation generator for JavaScript, similar to Javadoc or phpDocumentor.
                            You add documentation comments directly to your source code, right alongside the code itself.
                            The JSDoc tool will scan your source code and generate an HTML documentation website for you.
                        </div>
                    </BranchMenu>
                </Branch>
                <Branch>
                    <BranchButton>Click c</BranchButton>
                    <BranchMenu>
                        <div>
                            JSDoc 3 is an API documentation generator for JavaScript, similar to Javadoc or phpDocumentor.
                            You add documentation comments directly to your source code, right alongside the code itself.
                        </div>
                        <div>
                            <p className="p-3">anotha one</p>
                        </div>

                        <Branch>
                            <BranchButton>Click d</BranchButton>
                            <BranchMenu>
                                <div>
                                    JSDoc 3 is an API documentation generator for JavaScript, similar to Javadoc or phpDocumentor.
                                    You add documentation comments directly to your source code, right alongside the code itself.
                                    The JSDoc tool will scan your source code and generate an HTML documentation website for you.
                                </div>
                            </BranchMenu>
                        </Branch>
                        <Branch>
                            <BranchButton>Click e</BranchButton>
                            <BranchMenu>
                                <div>
                                    JSDoc 3 is an API documentation generator for JavaScript, similar to Javadoc or phpDocumentor.
                                    You add documentation comments directly to your source code, right alongside the code itself.
                                </div>
                                <div>
                                    <p className="p-3">anotha one</p>
                                </div>
                            </BranchMenu>
                        </Branch>

                    </BranchMenu>
                </Branch>
            </BranchMenu>
        </Branch>

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