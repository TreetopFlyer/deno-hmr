import { debounce } from "https://deno.land/std@0.151.0/async/debounce.ts";
import { walk } from "https://deno.land/std@0.155.0/fs/mod.ts";
import { serve } from "https://deno.land/std@0.155.0/http/server.ts";
import MIMELUT from "./mime.json" assert {type:"json"};

const dirActive = Deno.cwd(); console.log("Overwatch running at", dirActive);
const dirClient = "client";
const dirStatic = "static";


/** WebSocket and HTTP Server ******************************************/
const Sockets:Set<WebSocket> = new Set();
const SocketsBroadcast =(inData:string)=>
{
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

    if(url.pathname.startsWith("/"+dirClient))
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

    if(url.pathname.startsWith("/"+dirStatic))
    {
        const text = await Deno.open("./"+url.pathname);
        const ext:string = url.pathname.substring(url.pathname.lastIndexOf(".")) ?? "";
        const type = (MIMELUT as {[key:string]:string})[ext] ?? "application/javascript";
        return new Response(text.readable, {status:200, headers:{"content-type": `${type}; charset=utf-8`}});
    }

    return new Response(`<!doctype html>
    <html>
        <head></head>
        <body>
            <h1>Sample File</h1>
            <h2> -- </h2>
            <script type="module">
                import Reloader from "/hmr-source";
                import * as I from "/client/test.tsx";
                const updateTitle =()=> document.querySelector("h2").innerHTML = I.default;
                updateTitle();
                Reloader("reload-complete", updateTitle);
            </script>
        </body>
    </html>`, {status:200, headers:{"content-type":"text/html"}});

}, {port:8000});


/** File System Launcher/Watcher ******************************************/
export type MemoryFile = {
    xpiled?:string,
    source?:string,
    styles?:string,
};
const watcher = Deno.watchFs(dirClient);
localStorage.clear();
const XPile =async(inFullProjectPath:string, checkFirst=false, deletion=false):Promise<string>=>
{
    const ext = inFullProjectPath.substring(inFullProjectPath.lastIndexOf("."));
    const cachePathBase = dirActive + "\\.cached\\gen\\file\\" + inFullProjectPath.replace(":", "");
    const cachePath = cachePathBase+".js";
    
    const webPath = inFullProjectPath.substring(dirActive.length).replaceAll("\\", "/");
    const isTranspiled = (ext == ".ts" || ext == ".tsx" || ext == ".jsx");

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
        const imp = await import("."+inModule);
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
    
    return webPath;

};
for await (const entry of walk(dirActive+"\\"+dirClient, {includeDirs:false}))
{
    await XPile(entry.path, true);
}
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
}, 2000);
for await (const event of watcher)
{
    event.paths.forEach( path => filesChanged.set(path, event.kind) );
    ProcessFiles();
}