import { debounce } from "https://deno.land/std@0.151.0/async/debounce.ts";
import { walk } from "https://deno.land/std@0.155.0/fs/mod.ts";

export type MemoryFile = {
    xpiled?:string,
    source?:string,
    styles?:string,
};

const dirCWD = Deno.cwd(); console.log("Overwatch running at", dirCWD);

// http server
let Server:Deno.Process<Deno.RunOptions>|undefined;
const ServerArgs:Deno.RunOptions = {cmd:["deno", "run", "-A", "--unstable", "underwatch.tsx"]};
const ServerReboot =():void=>
{
    console.log("Overwatch: reloading HTTP server.")
    Server?.kill("SIGTERM");
    Server?.close();
    Server = Deno.run(ServerArgs);
};
ServerReboot();

// websocket server for HMR
const Sockets:Set<WebSocket> = new Set();
const SocketsBroadcast =(inData:string)=>
{
    for (const socket of Sockets){ socket.send(inData); }
}
Deno.serve({port:4422}, (inRequest)=>
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
      socket.onmessage = (e) =>
      {
        if(e.data == "reload")
        {
            ServerReboot();
        }
      };
      socket.onerror = (e) => console.log("Ovrwatch: Socket errored:", e);
      console.log("Overwatch: WebSocket server loaded.")
      return response;
    }
    catch
    {
      return new Response("Overwatch: Not a websocket request.");
    }
});


const watcher = Deno.watchFs("project");
localStorage.clear();
const XPile =async(inFullProjectPath:string, checkFirst=false, deletion=false):Promise<string>=>
{
    const ext = inFullProjectPath.substring(inFullProjectPath.lastIndexOf("."));
    const cachePathBase = dirCWD + "\\.cached\\gen\\file\\" + inFullProjectPath.replace(":", "");
    const cachePath = cachePathBase+".js";
    
    const webPath = inFullProjectPath.substring(dirCWD.length).replaceAll("\\", "/");
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
    const WriteMemory =(code:string, isTranspiled:boolean)=>
    {
        if(isTranspiled)
        {
            const split = code.lastIndexOf("//# sourceMappingURL=");
            const wentIn = code.substring(0, split)
            localStorage.setItem(webPath, wentIn);
            localStorage.setItem(webPath+".map", code.substring(split));
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
            WriteMemory(code, isTranspiled);
        }
    };
    
    if(isTranspiled)
    {
        if(checkFirst)
        {
            const code:string|false = await ReadFile(cachePath);
            if(code)
            {
                WriteMemory(code, isTranspiled);
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
            WriteMemory(code, isTranspiled);
            console.log(`Overwatch: basic file added (${webPath})`);
        }
    }
    
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
for await (const entry of walk(dirCWD+"\\project", {includeDirs:false}))
{
    await XPile(entry.path, true);
}
for await (const event of watcher)
{
    event.paths.forEach(path =>
    {
        filesChanged.set(path, event.kind);
    });
    ProcessFiles();
}