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
          console.log("socket opened");
      };
      socket.onclose = () =>
      {
          Sockets.delete(socket);
          console.log("socket closed");
      };
      socket.onmessage = (e) =>
      {
        console.log("socket message:", e.data);
        if(e.data == "reload")
        {
            ServerReboot();
        }
      };
      socket.onerror = (e) => console.log("socket errored:", e);
      return response;
    }
    catch
    {
      return new Response("request isn't trying to upgrade to websocket.");
    }
});

localStorage.clear();
const filesChanged:Map<string, string> = new Map();
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
            console.log(`---- what went in ${wentIn.substring(0, 70)}`);
            console.log(`---- checking again ${localStorage.getItem(webPath).substring(0, 70)}`);
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
            code ? WriteMemory(code, isTranspiled) : await WriteCacheAndMemory(inFullProjectPath, cachePath, isTranspiled);
        }
        else
        {
            await WriteCacheAndMemory(inFullProjectPath, cachePath, isTranspiled);
        }
    }
    else
    {
        const code = await ReadFile(inFullProjectPath);
        if(code)
        {
            WriteMemory(code, isTranspiled)
        }
    }

    return webPath;

}
// WALKER | To initialize the program: process all project files.
// - look in project/, find the equivalent in the cache, and push things into Memory
for await (const entry of walk(dirCWD+"\\project", {includeDirs:false}))
{
    console.log("Walker", entry.path);
    await XPile(entry.path, true);
}
console.log(localStorage);
// WATCHER | As the program runs, process individual files as they are changed.
// - look in project/ and push things into Memory *and* .cached/
const watcher = Deno.watchFs("project");
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
for await (const event of watcher)
{
    event.paths.forEach(path =>
    {
        console.log("Watcher", path);
        filesChanged.set(path, event.kind);
    });
    ProcessFiles();
}