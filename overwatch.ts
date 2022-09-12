import { debounce } from "https://deno.land/std@0.151.0/async/debounce.ts";
import { walk } from "https://deno.land/std@0.155.0/fs/mod.ts";

export type MemoryFile = {
    xpiled?:string,
    source?:string,
    styles?:string,
};

const filesChanged:Map<string, string> = new Map();
export const Memory:Map<string, MemoryFile> = new Map();
const dirCWD = Deno.cwd(); console.log("Overwatch running at", dirCWD);
const Sockets:Set<WebSocket> = new Set();
const SocketsBroadcast =(inData:string)=>
{
    for (const socket of Sockets){ socket.send(inData); }
}
// http server
let Server:Deno.Process<Deno.RunOptions>|undefined;
const ServerArgs:Deno.RunOptions = {cmd:["deno", "run", "-A", "--unstable", "underwatch.tsx"]};
const ServerReboot =():void=>
{
    Server?.kill("SIGTERM");
    Server?.close();
    Server = Deno.run(ServerArgs);
};

const ProcessFiles =debounce(async()=>
{
    console.log("processing files");
    for await (const [file, action] of filesChanged)
    {
        await FileProcessor(file, action);
    }
    filesChanged.clear();
    SocketsBroadcast("reload")
}, 500);
const FileProcessor =async(inFile:string, inAction:string)=>
{
    const options:Deno.RunOptions = {cmd:["deno", "cache", `${inFile}`]};
    const { web, cached, extension } = FilePathParts(inFile);
    if(inAction == "remove")
    {
        console.log("need to delete", cached);
        Memory.delete(web);
    }
    else if (extension == ".ts" || extension == ".tsx" || extension == ".jsx")
    {
        try
        {
            const process = Deno.run(options);
            await process.status();
            try
            {
                const file = await FileFromCached(cached);
                Memory.set(web, file);
                console.log(`File Processor: ${web} successfully updated.`);
            }
            catch(e)
            {
                console.error("File Processor: error reading cached file", e);
            }
        }
        catch(e)
        {
            console.error("File Processor: error starting subprocess", e);
        }
    }
    else
    {
        const code = await Deno.readTextFile(inFile);
        Memory.set(web, {xpiled:code});
    }
};
const FilePathParts =(inFullProjectPath:string):{cached:string, web:string, extension:string}=>
{
    const cwdDir = Deno.cwd();
    const cacheDir = cwdDir + "\\.cached\\gen\\file\\" + inFullProjectPath.replace(":", "")+".js";
    const webDir = inFullProjectPath.substring(cwdDir.length).replaceAll("\\", "/");
    const ext = inFullProjectPath.substring(inFullProjectPath.lastIndexOf("."));
    return { cached: cacheDir, web: webDir, extension: ext };
}
const FileFromCached =async(inCacheDir:string):Promise<MemoryFile>=>
{
    const code = await Deno.readTextFile(inCacheDir);
    const split = code.lastIndexOf("//# sourceMappingURL=");
    return {
        xpiled: code.substring(0, split),
        source: code.substring(split)
    };
};

// websocket server for HMR
Deno.serve({port:4422}, (inRequest)=>
{
    //const upgrade = inRequest.headers.get("upgrade") || "";
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

ServerReboot();

// WALKER | To initialize the program: process all project files.
// - look in project/, find the equivalent in the cache, and push things into Memory
for await (const entry of walk(Deno.cwd()+"\\project", {includeDirs:false, exts:[".ts", ".tsx", ".js", ".jsx"]}))
{
    const { web, cached, extension } = FilePathParts(entry.path);
    if(extension == ".ts" || extension == ".tsx" || extension == ".jsx")
    {
        try
        {
            // try to pull the file from cache
            const file = await FileFromCached(cached);
            Memory.set(web, file);
            console.log(`cached version of ${web} found.`);
        }
        catch
        {
            // add to cache and then pull
            await FileProcessor(entry.path, "initialize");
            console.log(`cached version of ${web} has just been created.`);
        }
    }
    else
    {
        const code = await Deno.readTextFile(entry.path)
        Memory.set(web, { xpiled: code });
    }
    
}

// WATCHER | As the program runs, process individual files as they are changed.
// - look in project/ and push things into Memory *and* .cached/
const watcher = Deno.watchFs("project");
for await (const event of watcher)
{
    event.paths.forEach(path =>
    {
        console.log("Watcher", path);
        filesChanged.set(path, event.kind);
    });
    ProcessFiles();
}