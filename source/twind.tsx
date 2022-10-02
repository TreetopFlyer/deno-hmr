import * as Twind from "https://esm.sh/twind";
import * as TwindServer from "https://esm.sh/twind/shim/server";

const Config = {preflight: false, theme:{}, plugins:{}};

const RealSheet = TwindServer.virtualSheet();
const RealTwind = Twind.create({ ...Config, sheet: RealSheet, mode: "silent" });

const Expander =(inTwindConfig, inTwindTW)=>
{

    const TestSheet = TwindServer.virtualSheet();
    const TestTwind = Twind.create({ ...inTwindConfig, sheet: TestSheet, preflight: false, mode: "silent" });

    const file = `
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
                <a className="px-4 py-1 bg-black rounded-full text(white center)" href="/">home</a>
                <a className="px-4 py-1 bg-black rounded-full text(white center)" href="/about">about</a>
                <a className="px-4 py-1 bg-black rounded-full text(white center)" href="/blog">blog</a>
            </nav>

    `;

    const fileOut:string[] = [];
    let match = 0;
    const getNextRange =()=>
    {
        const firstQuote = file.indexOf(`"`, match);
        if(firstQuote == -1){
            fileOut.push(file.substring(match));
            return false;
        }
        const secondQuote =  file.indexOf(`"`, firstQuote+1);
        if(secondQuote == -1){
            console.error("document is malformed, odd number of quotation marks")
            return false;
        }

        const tail = file.substring(match, firstQuote)
        fileOut.push(tail);
        match = secondQuote + 1;

        const sample = file.substring(firstQuote+1, secondQuote);
        TestSheet.reset();
        TwindServer.shim(`<a class="${sample}"`, TestTwind);
        if(TwindServer.getStyleTagProperties(TestSheet).textContent == "")
        {
            fileOut.push(sample);
        }
        else
        {
            inTwindTW(sample);
            fileOut.push(Twind.expandGroups(sample));
        }

        if(secondQuote == file.length-1)
        {
            fileOut.push("");
        }

        return [firstQuote, secondQuote];
    };
    let parse = getNextRange();
    while(parse)
    {
        parse = getNextRange();
    }

    return fileOut.join(`"`);
};

const file = Expander(Config, RealTwind.tw);

console.log(file);
console.log(TwindServer.getStyleTagProperties(RealSheet).textContent);
