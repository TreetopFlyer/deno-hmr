import React from "react";
import { useMetas, useRoute, useFetch, useBase, Switch, Case, Metas } from "amber";

const PartBlog =()=>
{
    useMetas({Title:"Blog!"});
    return <div>
        <h3 className="text-xl font(black sans) p-4">Blog!</h3>
        <p>blog section</p>
    </div>;
};

const PartAbout =()=>
{
    const [routeGet] = useRoute();
    useMetas({Title:"About!"});
    const base = useBase();

    return <div>
        <h3 className="text-xl font(black sans) p-4">About!</h3>
        <p>about section <span className="text-xl font-black">{base}</span></p>
        <nav>
            <a className="p-4 mr-2" href={base+"/me"}>me</a>
            <a className="p-4 mr-2" href={base+"/us"}>us</a>
        </nav>
    </div>;
};

const PartMe =()=>
{
    useMetas({Title:"MEEE"});
    const base = useBase(0);

    return <p>me?<span className="text-xl font-black">{base}</span></p>;
}

const Search = React.lazy(()=>import("./Search.tsx"));

export default ()=>
{
    const [routeGet] = useRoute();
    const [stateGet, stateSet] = React.useState(4);

    const folder = routeGet.Parts.length ? routeGet.Parts[0] : "";
    const status = useFetch("https://catfact.ninja/fact");
    const highlight =(inPath:string)=> folder == inPath ? "bg-green-500" : "bg-black";

    return <div className="p-2 border">
    <h1 className="p-4 border">current route: {folder}</h1>
    <p className="p-4 border text-xl" onClick={e=>stateSet(stateGet+1)}>current!: {JSON.stringify(routeGet.Query)}</p>
    <nav>
        <a className={`text-white p-2 ${highlight("")}`} href="/">Home</a>
        <a className={`text-white p-2 ${highlight("about")}`} href="/about">About</a>
        <a className={`text-white p-2 ${highlight("blog")}`} href="/blog">Blog</a>
        <a className={`text-white p-2 ${highlight("search")}`} href="/search">Search</a>
        <a className={`text-white p-2 ${highlight("404")}`} href="/404">404</a>
    </nav> 
    <div className="p-4 border border-red-500">
        <>
            {status.Data}
        </>
    </div>

        <Switch value={routeGet.Parts[0]}>
            <Case value={""}>
                <img src="static/Logo.svg" />
            </Case>
            <Case value={"blog"}>
                <PartBlog />
            </Case>
            <Case value={"search"}>
                <React.Suspense fallback={<div>Loading Search Component</div>}>
                    <Search/>
                </React.Suspense>
            </Case>
            <Case>
                <p>404 i guess</p>
            </Case>
        </Switch>

        <Switch value={routeGet}>
            <Case value={`/about`}>
                <p>about matched!!!!!</p>
                <PartAbout/>
                <Switch value={routeGet}>
                    <Case value={`/me`}>
                        <PartMe/>
                    </Case>
                    <Case value={`/us`}>
                        <Metas title="We the ppl"/>
                        <p>its a we thang</p>
                    </Case>
                </Switch>
            </Case>
        </Switch>
    </div>
};
