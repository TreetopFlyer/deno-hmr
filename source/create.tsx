import React from "react";
import ReactDOMServer from "react-dom/server";
import { debounce } from "https://deno.land/std@0.151.0/async/debounce.ts";
import { walk } from "https://deno.land/std@0.155.0/fs/mod.ts";
import { serve } from "https://deno.land/std@0.155.0/http/server.ts";
import MIMELUT from "./mime.json" assert {type:"json"};

import * as ESBuild from "https://deno.land/x/esbuild@v0.14.45/mod.js";
import * as Twind from "https://esm.sh/twind";
import * as TwindServer from "https://esm.sh/twind/shim/server";
import { type State, PathParse, IsoProvider } from "./client.tsx";

export type MemoryFile = {
    xpiled?:string,
    source?:string,
    styles?:string,
};

const options = {
    Themed: "twind.ts",
    Source: "source",
    Static: "static",
    Client: "client",
    Launch: "App.tsx",
    Import: "imports.json",
    Deploy: 3333,
    Active: Deno.cwd(),
};
for(let i=0; i<Deno.args.length; i++)
{
    const arg = Deno.args[i];
    if(arg.startsWith("--"))
    {
        const [key, value] = arg.split("=");
             if(key == "--source"){ options.Source = value; }
        else if(key == "--static"){ options.Static = value; }
        else if(key == "--client"){ options.Client = value; }
        else if(key == "--launch"){ options.Launch = value; }
        else if(key == "--import"){ options.Import = value; }
        else if(key == "--themed"){ options.Themed = value; }
        else if(key == "--deploy"){ options.Deploy = parseInt(value); }
    }
}

try { options.Import = await Deno.readTextFile(options.Import); }
catch(e) { console.log(`Amber Start: (ERROR) Import map "${options.Import}" not found`); }
console.log("Overwatch running at", options.Active);

/** React Components ******************************************/
// load App and Shell
let App = ()=>null;
let Shell =({isoModel, styles, importMap, bake, appPath}:{isoModel:State, styles:string, importMap:string, bake:string, appPath:string})=>
{
    return <html>
        <head>
            <title>{isoModel.Meta.Title??""}</title>
            <link rel="canonical" href={isoModel.Path.Parts.join("/")}></link>
            <meta name="viewport" content="width=device-width, initial-scale=1"/>
            <meta name="description" content={isoModel.Meta.Description??""}/>
            <style id="tw-main" dangerouslySetInnerHTML={{__html:styles}}/>
            
            <script type="importmap" dangerouslySetInnerHTML={{__html:importMap}}/>
        </head>
        <body>
            <div id="app" dangerouslySetInnerHTML={{__html:bake}}></div>
            <script type="module" dangerouslySetInnerHTML={{__html:
    `import {createElement as h} from "react";
    import {hydrateRoot, createRoot} from "react-dom/client";
    import App from "./${appPath}";
    import { IsoProvider } from "amber";
    
    const iso = ${JSON.stringify(isoModel)};      
    const dom = document.querySelector("#app");
    const app = h(IsoProvider, {seed:iso}, h(App));
    const url = new URL(location.href);

    hydrateRoot(dom, app);

    import Reloader from "/hmr-source";
    const root = createRoot(dom);
    Reloader("reload-complete", ()=>
    {
        console.log("reload handler called in browser", root);
        //root.render(app);
        window.location.search="?reload="+Math.random();
    });


    `}}/>
        </body>
    </html>;
}

const appPath = `file://${options.Active}/${options.Client}/${options.Launch}`;
try
{
    const appImport = await import(appPath);
    App = appImport.default;
    if(appImport.Shell)
    {
        Shell = appImport.Shell;
    }
}
catch(e) { console.log(e); console.log(`Launch file "${options.Launch}" cound not be found in Client directory "${appPath}".`); }

const SSR =async(inURL:URL):Promise<ReactDOMServer.ReactDOMServerReadableStream>=>
{
    const isoModel:State = { Meta:{}, Data:{}, Path:PathParse(inURL), Client:false, Queue:[] }
    let bake = ReactDOMServer.renderToString(<IsoProvider seed={isoModel}><App/></IsoProvider>);
    let count = 0;
    while(isoModel.Queue.length)
    {
        count ++;
        if(count > 5) { break; }
        await Promise.all(isoModel.Queue);
        isoModel.Queue = [];
        bake = ReactDOMServer.renderToString(<IsoProvider seed={isoModel}><App/></IsoProvider>);
    }
    isoModel.Client = true;
    return ReactDOMServer.renderToReadableStream(<Shell isoModel={isoModel} styles={""} importMap={options.Import} bake={bake} appPath={`./${options.Client}/${options.Launch}`} />);
};


/** WebSocket and HTTP Server ******************************************/
const Sockets:Set<WebSocket> = new Set();
const SocketsBroadcast =(inData:string)=>
{
    console.log("Broadcasting", inData);
    for (const socket of Sockets){ socket.send(inData); }
}
serve(async(inRequest)=>
{
    const url = new URL(inRequest.url);
        
    if(url.pathname == "/favicon.ico")
    {
        return new Response("", {status:404});
    }

    if(url.pathname == "/hmr-source")
    {
        return new Response(`
        let reloads = 0;
        const socket = new WebSocket("ws://"+document.location.host+"/hmr-listen");
        socket.addEventListener('message', (event) =>
        {
            const members = listeners.get(event.data)??[];
            reloads++;
            Promise.all(
                members.map(m=>
                {
                    return import(event.data+"?reload="+reloads)
                    .then(updatedModule=>m(updatedModule));
                })
            ).then(()=>
            {
                const members = listeners.get("reload-complete")??[];
                members.forEach(m=>m());
            });
        });
        
        const listeners = new Map();
        export default (path, handler)=>
        {
            const members = listeners.get(path)??[];
            members.push(handler);
            listeners.set(path, members);
        };`, {status:200, headers:{"content-type":"application/javascript"}});
    }

    if(url.pathname == "/hmr-listen")
    {
        try
        {
          const { response, socket } = Deno.upgradeWebSocket(inRequest);
          socket.onopen = () =>
          {
              Sockets.add(socket);
              console.log("Overwatch: Socket created");
          };
          socket.onclose = () =>
          {
              Sockets.delete(socket);
              console.log("Overwatch: Socket deleted");
          };
          socket.onmessage = (e) => {};
          socket.onerror = (e) => console.log("Overwatch: Socket errored:", e);
          return response;
        }
        catch
        {
          return new Response("Overwatch: Not a websocket request.");
        }
    }

    if(url.pathname.startsWith("/"+options.Client) || url.pathname.startsWith("/"+options.Source) )
    {
        const endsWith = url.pathname.substring(url.pathname.lastIndexOf("."));
        if(endsWith == ".tsx" || endsWith == ".ts" || endsWith == ".jsx")
        {
            if(url.searchParams.get("reload"))
            {
                console.log("serving updated module", url.pathname);
                return new Response(localStorage.getItem(url.pathname), {status:200, headers:{"content-type":"application/javascript", "cache-control":"no-cache,no-save"}});
            }
            else
            {
                console.log("serving proxy for", url.pathname);
                return new Response(localStorage.getItem(url.pathname+".pxy"), {status:200, headers:{"content-type":"application/javascript", "cache-control":"no-cache,no-save"}});
            }
        }
        else
        {
            return new Response(localStorage.getItem(url.pathname), {status:200, headers:{"content-type":"application/javascript", "cache-control":"no-cache,no-save"}});
        }
    }

    if(url.pathname.startsWith("/"+options.Static))
    {
        const text = await Deno.open("./"+url.pathname);
        const ext:string = url.pathname.substring(url.pathname.lastIndexOf(".")) ?? "";
        const type = (MIMELUT as {[key:string]:string})[ext] ?? "application/javascript";
        return new Response(text.readable, {status:200, headers:{"content-type": `${type}; charset=utf-8`}});
    }

    const rendered = await SSR(url);
    return new Response(rendered, {status:200, headers:{"content-type":"text/html"}});

}, {port:8000});


/** File System Launcher/Watcher ******************************************/

localStorage.clear();
const XPile =async(inFullProjectPath:string, checkFirst=false, deletion=false):Promise<string>=>
{
    const ext = inFullProjectPath.substring(inFullProjectPath.lastIndexOf("."));
    const cachePathBase = options.Active + "\\.cached\\gen\\file\\" + inFullProjectPath.replace(":", "");
    const cachePath = cachePathBase+".js";
    
    const webPath = inFullProjectPath.substring(options.Active.length).replaceAll("\\", "/");
    const isTranspiled = (ext == ".ts" || ext == ".tsx" || ext == ".jsx");

    console.log("xpile started.....", webPath);

    if(deletion)
    {
        if(isTranspiled)
        {
            const cachePathMeta = cachePathBase+".meta";
            await Deno.remove(cachePath);
            await Deno.remove(cachePathMeta);
            localStorage.removeItem(webPath);
            localStorage.removeItem(webPath+".map");
            localStorage.removeItem(webPath+".pxy");
        }
        else
        {
            localStorage.removeItem(webPath);
        }
        console.log(`Overwatch: removed (${webPath})`);
        return webPath;
    }

    const ReadFile =async(cachePath:string):Promise<string|false>=>
    {
        try
        {
            const code = await Deno.readTextFile(cachePath);
            return code;
        }
        catch{ return false; }
    };
    const WriteCache =async(inFullProjectPath:string):Promise<void>=>
    {
        const process = Deno.run({cmd:["deno", "cache", `${inFullProjectPath}`]});
        await process.status();
    };
    const WriteMemory =async(code:string, isTranspiled:boolean):Promise<void>=>
    {
        if(isTranspiled)
        {
            const split = code.lastIndexOf("//# sourceMappingURL=");
            const wentIn = code.substring(0, split);
            const proxy = await HMRProxy(webPath);

            localStorage.setItem(webPath, wentIn);
            localStorage.setItem(webPath+".map", code.substring(split));
            localStorage.setItem(webPath+".pxy", proxy);
        }
        else
        {
            localStorage.setItem(webPath, code);
        }
    };
    const WriteCacheAndMemory =async(inFullProjectPath:string, cachePath:string, isTranspiled:boolean)=>
    {
        await WriteCache(inFullProjectPath);
        const code:string|false = await ReadFile(cachePath);
        if(code)
        {
            await WriteMemory(code, isTranspiled);
        }
    };
    const HMRProxy = async(inModule:string):Promise<string>=>
    {
        const imp = await import("file://"+options.Active+inModule);
        const members = [];
        for( const key in imp ) { members.push(key); }
        return `
        import * as Import from "${inModule}?reload=0";
        import Reloader from "/hmr-source";
        ${ members.map(m=>`let proxy_${m} = Import.${m}; export { proxy_${m} as ${m} };`).join(" ") }
        const reloadHandler = (updatedModule)=>{ ${ members.map(m=>`proxy_${m} = updatedModule.${m};`).join(" ") }};
        Reloader("${inModule}", reloadHandler);`;
    };



    if(isTranspiled)
    {
        if(checkFirst)
        {
            const code:string|false = await ReadFile(cachePath);
            if(code)
            {
                await WriteMemory(code, isTranspiled);
                console.log(`Overwatch: loaded from cache (${webPath})`);
            }
            else
            {
                await WriteCacheAndMemory(inFullProjectPath, cachePath, isTranspiled);
                console.log(`Overwatch: added to cache (${webPath})`);
            }
        }
        else
        {
            await WriteCacheAndMemory(inFullProjectPath, cachePath, isTranspiled);
            console.log(`Overwatch: updated cache of (${webPath})`);
        }
    }
    else
    {
        const code:string|false = await ReadFile(inFullProjectPath);
        if(code)
        {
            await WriteMemory(code, isTranspiled);
            console.log(`Overwatch: basic file added (${webPath})`);
        }
    }
    
    console.log("xpile done!", webPath);
    return webPath;
};

for await (const entry of walk(options.Active+"\\"+options.Client, {includeDirs:false}))
{
    await XPile(entry.path, true);
}
await XPile(options.Active+"\\"+options.Source+"\\client.tsx", true);

const filesChanged:Map<string, string> = new Map();
const ProcessFiles =debounce(async()=>
{
    for await (const [file, action] of filesChanged)
    {
        if(action=="remove")
        {
            await XPile(file, false, true);
        }
        else
        {
            const updated = await XPile(file, false);
            SocketsBroadcast(updated);
        }
    }
    filesChanged.clear();
}, 500);

const watcher = Deno.watchFs(options.Client);
for await (const event of watcher)
{
    console.log("watch event", event);
    event.paths.forEach( path => filesChanged.set(path, event.kind) );
    ProcessFiles();
}