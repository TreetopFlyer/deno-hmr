import React from "react";
import ReactDOMServer from "react-dom/server";
import { debounce } from "https://deno.land/std@0.151.0/async/debounce.ts";
import { walk } from "https://deno.land/std@0.155.0/fs/mod.ts";
import { serve } from "https://deno.land/std@0.155.0/http/server.ts";
import MIMELUT from "./mime.json" assert {type:"json"};

import * as ESBuild from "https://deno.land/x/esbuild@v0.14.45/mod.js";
import * as Twind from "https://esm.sh/twind";
import * as TwindServer from "https://esm.sh/twind/shim/server";
import { type State, type ShellComponent, type AppComponent, PathParse, IsoProvider } from "./client.tsx";

export type MemoryFile = {
    xpiled?:string,
    source?:string,
    styles?:string,
};

/** Initialization/Setup ******************************************/

const options = {
    Themed: "twind.tsx",
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

type LoadedResources =
{
    Import:{imports:{[key:string]:string}},
    Themed:{theme:{[key:string]:unknown}, plugins:{[key:string]:unknown}},
    Launch:{App:AppComponent, Shell:ShellComponent};
};
const Loaded:LoadedResources =
{
    Import:{imports:{}},
    Launch:{
        App:()=><></>,
        Shell:({isoModel, styles, shimSetup, importMap, bake, appPath})=>
        {
            return <html>
                <head>
                    <title>{isoModel.Meta.Title??""}</title>
                    <link rel="canonical" href={isoModel.Path.Parts.join("/")}></link>
                    <meta name="viewport" content="width=device-width, initial-scale=1"/>
                    <meta name="description" content={isoModel.Meta.Description??""}/>
                    <style id="tw-main" dangerouslySetInnerHTML={{__html:styles}}/>
                    <script type="importmap" dangerouslySetInnerHTML={{__html:importMap}} />
                </head>
                <body>
                    <div id="app" dangerouslySetInnerHTML={{__html:bake}}></div>
                    <script type="module" dangerouslySetInnerHTML={{__html:
`import React, {createElement as h} from "react";
import {hydrateRoot, createRoot} from "react-dom/client";
import App from "${appPath}";
import { IsoProvider } from "amber";

const iso = ${JSON.stringify(isoModel)};      
const dom = document.querySelector("#app");
const app = h(IsoProvider, {seed:iso}, h(App));
const url = new URL(location.href);

/// Server Mode: hydrate server html
//hydrateRoot(dom, app);

/// Create Mode: client-side rendering and setup of twind
import Reloader from "/hmr-source";
Reloader("reload-complete", window.HMR.update);
import { setup } from "https://esm.sh/twind@0.16.17/shim";
setup(${shimSetup});
createRoot(dom).render(app);
`}}/>
                </body>
            </html>;
        }
    },
    Themed:{theme:{}, plugins:{}}
};

export const FullPaths = {
    Import:`file://${options.Active}/${options.Import}`,
    Themed:`file://${options.Active}/${options.Themed}`,
    Launch:`file://${options.Active}/${options.Client}/${options.Launch}`,
    Cached:`file://${options.Active}/${Deno.env.get("DENO_DIR")}/gen/file/${options.Active.replace(":", "")}/`
};



export const ShortPaths = {
    Client: `/${options.Source}/client.tsx`,
    Launch: `/${options.Client}/${options.Launch}`,
    HMRSource:`/hmr-source`,
    HMRListen:`/hmr-listen`,
    HMRReactProxy:`/hmr-react-proxy`
};

export const LitCode = {
HMRInit:`
import Reloader from "${ShortPaths.HMRSource}";
Reloader("reload-complete", window.HMR.update);`,
HMRSource: `
let reloads = 0;
const socket = new WebSocket("ws://"+document.location.host+"${ShortPaths.HMRListen}");
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
};`,
HMRModuleProxy:async(inModule:string):Promise<string>=>
{
    const imp = await import("file://"+options.Active+inModule);
    const members = [];
    for( const key in imp ) { members.push(key); }
    return `
    import * as Import from "${inModule}?reload=0";
    import Reloader from "${ShortPaths.HMRSource}";
    ${ members.map(m=>`let proxy_${m} = Import.${m}; export { proxy_${m} as ${m} };`).join(" ") }
    const reloadHandler = (updatedModule)=>{ ${ members.map(m=>`proxy_${m} = updatedModule.${m};`).join(" ") }};
    Reloader("${inModule}", reloadHandler);`;
},
HMRReactProxy:`
import * as ReactParts from "react-alias";
window.HMR = { registered:new Map() };
window.HMR.onChange =(key, value)=>
{
    window.HMR.registered.set(key, value);
};
window.HMR.update =()=>
{
    const keys = [];
    for(const [key, value] of window.HMR.registered){ keys.push(key); }
    window.HMR.registered.clear();
    keys.forEach(k=>k());
};
const ProxyElement =(props)=>
{
    const [stateGet, stateSet] = ReactParts.useState(0);
    ReactParts.useEffect(()=>window.HMR.onChange( ()=>stateSet(stateGet+1), "yep" ));
    return ReactParts.createElement(props.children.type, {...props.children.props, _proxy:Math.random()})
};
const ProxyCreate =(...args)=>
{
    const el = ReactParts.createElement(...args)
    return typeof args[0] != "string" ? ReactParts.createElement(ProxyElement, null, el) : el;
};
export * from "react-alias";
export default ReactParts.default;
export { ProxyCreate as createElement };`
};

// tweak import map for browser
try
{
    const mapImport = await import(FullPaths.Import, {assert:{type:"json"}});
    Loaded.Import = mapImport.default;
    const imports = Loaded.Import.imports;

    if(!imports["react"]){ throw `import map does not alias "react"`; }
    if(!imports["react-dom/"]){ throw `import map does not alias "react-dom/"`;}

    /// Create Mode: 
    imports["react-alias"] = imports["react"];
    imports["react"] = "/hmr-react-proxy";

    for( const key in imports)
    {
        const value = imports[key];
        if(value.indexOf(ShortPaths.Client) != -1)
        {
            imports[key] = ShortPaths.Client;
        }
    }
}
catch(e) { console.log(`Amber Start: (ERROR) loading import map "${FullPaths.Import}" ${e}`); }

/// Any Mode: load the tailwind config settings
try
{
    const twindImport = await import(FullPaths.Themed);
    if(twindImport.default)
    {
        Loaded.Themed.plugins = twindImport.default.plugins??{};
        Loaded.Themed.theme = twindImport.default.theme??{};
    }
}
catch(e) { console.log(`Amber Start: (ERROR) loading twind config "${FullPaths.Themed}" ${e}`) }

/// Any Mode: load App and Shell
try
{
    const appImport = await import(FullPaths.Launch);
    Loaded.Launch.App = appImport.default;
    if(appImport.Shell)
    {
        Loaded.Launch.Shell = appImport.Shell;
    }
}
catch(e) { console.log(e); console.log(`Amber Start: (ERROR) loading launch app "${FullPaths.Launch}"`, e); }

/// Server Mode: Render react app
const SSR =async(inURL:URL):Promise<ReactDOMServer.ReactDOMServerReadableStream>=>
{
    const isoModel:State = { Meta:{}, Data:{}, Path:PathParse(inURL), Client:false, Queue:[] }
    let bake = ReactDOMServer.renderToString(<IsoProvider seed={isoModel}><Loaded.Launch.App/></IsoProvider>);
    let count = 0;
    while(isoModel.Queue.length)
    {
        count ++;
        if(count > 5) { break; }
        await Promise.all(isoModel.Queue);
        isoModel.Queue = [];
        bake = ReactDOMServer.renderToString(<IsoProvider seed={isoModel}><Loaded.Launch.App/></IsoProvider>);
    }
    isoModel.Client = true;
    return ReactDOMServer.renderToReadableStream(
    <Loaded.Launch.Shell
        isoModel={isoModel}
        styles={""}
        shimSetup={JSON.stringify(Loaded.Themed)}
        importMap={JSON.stringify(Loaded.Import)}
        bake={bake}
        appPath={`./${options.Client}/${options.Launch}`}
    />);
};


/** WebSocket and HTTP Server ******************************************/
// some of this is create mode some is server mode depending on the route.
// assume each route is both modes unless otherwise stated.

/// Create Mode: misc items for websocket hmr updates
const Sockets:Set<WebSocket> = new Set();
const SocketsBroadcast =(inData:string)=>{ for (const socket of Sockets){ socket.send(inData); } }

serve(async(inRequest)=>
{
    const url = new URL(inRequest.url);

    /// Create Mode: all /hmr-* routes are for hot module reloading
    if(url.pathname == ShortPaths.HMRSource)
    {
        return new Response(LitCode.HMRSource, {status:200, headers:{"content-type":"application/javascript"}});
    }
    if(url.pathname == ShortPaths.HMRReactProxy)
    {
        return new Response(LitCode.HMRReactProxy, {status:200, headers:{"content-type":"application/javascript"}});
    }
    if(url.pathname == ShortPaths.HMRListen)
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
            /// Create Mode: this logic is for providing "proxied" modules
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
            /// Server mode: serve transpiled modules
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
            const proxy = await LitCode.HMRModuleProxy(webPath);

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