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

/** Initialization/Setup ******************************************/
export const options = {
    Themed: "twind.tsx",
    Source: "source",
    Static: "static",
    Client: "client",
    Launch: "App.tsx",
    Import: "imports.json",
    Deploy: 3333,
    Server: false,
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
        else if(key == "--server"){ options.Server = true; }
    }
}
export type LoadedResources = {
    Import:{imports:{[key:string]:string}},
    Themed:{theme:Twind.ThemeConfiguration, plugins:Record<string, Twind.Plugin | undefined>},
    Launch:{App:AppComponent, Shell:ShellComponent};
};
export const Loaded:LoadedResources =
{
    Import:{imports:{}},
    Launch:{
        App:()=><></>,
        Shell:({isoModel, styles, importMap, bake, init})=>
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
                    <script type="module" dangerouslySetInnerHTML={{__html:init}}/>
                </body>
            </html>;
        }
    },
    Themed:{theme:{}, plugins:{}}
};
export const FullPaths = {
    Import:`file://${options.Active}/${options.Import}`,
    Themed:`file://${options.Active}/${options.Themed}`,
    Launch:`file://${options.Active}/${options.Client}/${options.Launch}`
};
export const RoutePaths = {
    Amber: `/${options.Source}/client.tsx`,
    Entry: `/${options.Client}/${options.Launch}`,
    HMRSource:`/hmr-source`,
    HMRListen:`/hmr-listen`,
    HMRReactProxy:`/hmr-react-proxy`
};
export const LitCode = {
HMRInit:(isoModel:State)=>`
import React, {createElement as h} from "react";
import {hydrateRoot, createRoot} from "react-dom/client";
import App from "${RoutePaths.Entry}";
import { IsoProvider } from "amber";

const iso = ${JSON.stringify(isoModel)};      
const dom = document.querySelector("#app");
const url = new URL(location.href);
const app =()=> h(IsoProvider, {seed:iso}, h(App));

${  options.Server ?
    /* /// Server Mode: hydrate server html */
    `hydrateRoot(dom, h(app));`
    :
    /* /// Create Mode: client-side rendering and setup of twind */
    `import Reloader from "${RoutePaths.HMRSource}";
    Reloader("reload-complete", window.HMR.update);
    import { setup } from "https://esm.sh/twind@0.16.17/shim";
    setup(${JSON.stringify(Loaded.Themed)});
    createRoot(dom).render(h(app));`
}`,

HMRSource: `
let reloads = 0;
const socket = new WebSocket("ws://"+document.location.host+"${RoutePaths.HMRListen}");
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
    import Reloader from "${RoutePaths.HMRSource}";
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
    console.log("proxy re-rendering");
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
export const Util ={
    Extension: (inPath:string):string => inPath.substring(inPath.lastIndexOf(".")),
    JavaScript: (inExtension:string):boolean => inExtension == ".tsx" || inExtension == ".ts" || inExtension == ".jsx" || inExtension == ".js"
};
// tweak import map for browser
try
{
    const mapImport = await import(FullPaths.Import, {assert:{type:"json"}});
    Loaded.Import = mapImport.default;
    const imports = Loaded.Import.imports;

    /// Create Mode: 
    if(!options.Server)
    {
        imports["react-alias"] = imports["react"];
        imports["react"] = RoutePaths.HMRReactProxy;
    }

    for( const key in imports)
    {
        const value = imports[key];
        if(value.indexOf(RoutePaths.Amber) != -1)
        {
            imports[key] = RoutePaths.Amber;
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

/** WebSocket and HTTP Server ******************************************/
// some of this is create mode some is server mode depending on the route.
// assume each route is both modes unless otherwise stated.
/// Create Mode: misc items for websocket hmr updates
const Sockets:Set<WebSocket> = new Set();
const SocketsBroadcast =(inData:string)=>{ for (const socket of Sockets){ socket.send(inData); } }
const FileRoutes = options.Server ?
(url:URL, request:Request)=>
{
    /// Server Mode: all /hmr-* routes are for hot module reloading
    if(url.pathname.startsWith("/"+options.Client) || url.pathname.startsWith("/"+options.Source) )
    {
        return new Response(localStorage.getItem(url.pathname), {status:200, headers:{"content-type":"application/javascript"}});
    }
    else
    {
        return false;
    }
}
:
(url:URL, request:Request)=>
{
    /// Create Mode: all /hmr-* routes are for hot module reloading
    if(url.pathname == RoutePaths.HMRSource)
    {
        return new Response(LitCode.HMRSource, {status:200, headers:{"content-type":"application/javascript"}});
    }
    if(url.pathname == RoutePaths.HMRReactProxy)
    {
        return new Response(LitCode.HMRReactProxy, {status:200, headers:{"content-type":"application/javascript"}});
    }
    if(url.pathname == RoutePaths.HMRListen)
    {
        try
        {
          const { response, socket } = Deno.upgradeWebSocket(request);
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
        const ext = Util.Extension(url.pathname);
        if(Util.JavaScript(ext))
        {
            /// Create Mode: this logic is for providing "proxied" modules
            if(url.searchParams.get("reload") || url.pathname == RoutePaths.Amber)
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
    return false;
}
serve(async(inRequest)=>
{
    const url = new URL(inRequest.url);
    const file:Response|false = FileRoutes(url, inRequest);
    if(file)
    {
        return file;
    }
    else if(url.pathname.startsWith("/"+options.Static))
    {
        try
        {
            const text = await Deno.open("./"+url.pathname);
            const type = (MIMELUT as {[key:string]:string})[Util.Extension(url.pathname)] ?? "application/javascript";
            return new Response(text.readable, {status:200, headers:{"content-type": `${type}; charset=utf-8`}});
        }
        catch { return new Response("404", {status:404}); }
    }
    else
    {
        const isoModel:State = { Meta:{}, Data:{}, Path:PathParse(url), Client:false, Queue:[] }
        /// Server Mode: Render react app
        let bake = options.Server ? ReactDOMServer.renderToString(<IsoProvider seed={isoModel}><Loaded.Launch.App/></IsoProvider>) : "dev mode loading";
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
        const stream = await ReactDOMServer.renderToReadableStream(
        <Loaded.Launch.Shell isoModel={isoModel} styles={localStorage.getItem("stylesheet")??""} importMap={JSON.stringify(Loaded.Import)} bake={bake} init={LitCode.HMRInit(isoModel)}/>);
        return new Response(stream, {status:200, headers:{"content-type":"text/html"}});
    }

}, {port:8000});

/** File System Launcher/Watcher ******************************************/
const sheet = TwindServer.virtualSheet();
const parse = Twind.create({ sheet: sheet, preflight: true, theme:Loaded.Themed.plugins, plugins:Loaded.Themed.plugins, mode: "silent" }).tw;
const leave = [ "__defineGetter__", "__defineSetter__", "__lookupGetter__", "__lookupSetter__", "hasOwnProperty", "isPrototypeOf", "propertyIsEnumerable", "valueOf", "toLocaleString" ];

localStorage.clear();
const XPile =async(inFullProjectPath:string, checkFirst=false, deletion=false):Promise<string>=>
{
    const ext = Util.Extension(inFullProjectPath);
    const isTranspiled = Util.JavaScript(ext);
    const webPath = inFullProjectPath.substring(options.Active.length).replaceAll("\\", "/");

    if(deletion)
    {
        localStorage.removeItem(webPath);
        if(isTranspiled){ localStorage.removeItem(webPath+".pxy"); }
        return webPath;
    }
    try
    {
        if(checkFirst && localStorage.getItem(webPath))
        {
            //console.log("file aready cached");
        }
        else
        {
            const code = await Deno.readTextFile(inFullProjectPath);
            if(isTranspiled)
            {
                const parsed = await ESBuild.transform(code, {loader:"tsx", minify:true});
                const proxy = await LitCode.HMRModuleProxy(webPath);
                localStorage.setItem(webPath, parsed.code);
                localStorage.setItem(webPath+".pxy", proxy);
                if(options.Server)
                {
                    const m = parsed.code.match(/[^<>\[\]\(\)|&"'`\.\s]*[^<>\[\]\(\)|&"'`\.\s:]/g);
                    if (m)
                    {
                        for (const c of m)
                        {
                            if (leave.indexOf(c) === -1)
                            {
                                try { parse(c); }
                                catch (e) { console.log(`Error: Failed to handle the pattern '${c}'`); }
                            }
                        }
                    }
                }
            }
            else
            {
                localStorage.setItem(webPath, code);
            }
        }
    }
    catch(e){ console.log(`error caching "${inFullProjectPath}"`, e); }
    return webPath;
};
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
for await (const entry of walk(options.Active+"\\"+options.Client, {includeDirs:false}))
{
    await XPile(entry.path, true);
}

// import the Amber client from a potentially remote location and transpile it
const path = import.meta.url.split("/").slice(0, -2).join("/")+RoutePaths.Amber;
const amberClientFetch = await fetch(path);
const amberClientText = await amberClientFetch.text();
const amberClientParsed = await ESBuild.transform(amberClientText, {loader:"tsx", minify:true});
localStorage.setItem(RoutePaths.Amber, amberClientParsed.code);

if(!options.Server)
{
    const watcher = Deno.watchFs(options.Client);
    for await (const event of watcher)
    {
        event.paths.forEach( path => filesChanged.set(path, event.kind) );
        ProcessFiles();
    }
}
else
{
    localStorage.setItem("stylesheet", TwindServer.getStyleTagProperties(sheet).textContent);
}