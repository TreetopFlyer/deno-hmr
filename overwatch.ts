import { debounce } from "https://deno.land/std@0.151.0/async/debounce.ts";
import { walk } from "https://deno.land/std@0.155.0/fs/mod.ts";
import { isPathSeparator } from "https://deno.land/std@0.155.0/path/_util.ts";

export type MemoryFile = {
    xpiled?:string,
    source?:string,
    styles?:string,
};

const filesChanged:Map<string, string> = new Map();
export const Memory:Map<string, MemoryFile> = new Map();
const dirCWD = Deno.cwd();
console.log("Overwatch running at", dirCWD);

const ProcessFiles =debounce(async()=>
{
    console.log("processing files");
    for await (const [file, action] of filesChanged)
    {
        await FileProcessor(file, action);
    }
    filesChanged.clear();
}, 500);

const FileProcessor =async(inFile:string, inAction:string)=>
{
    console.log("FileProcessor sees", inFile)
    const options:Deno.RunOptions = {cmd:["deno", "cache", `${inFile}`], env:{"DENO_DIR":"./.cached"}};
    const cacheDir = dirCWD + "\\.cached\\gen\\file\\" + inFile.replace(":", "")+".js";
    const webDir = inFile.substring(dirCWD.length).replaceAll("\\", "/");
    const ext = inFile.substring(inFile.lastIndexOf("."));
    console.log("dirWeb in cache writer:", webDir);

    if(inAction == "remove")
    {
        Memory.delete(webDir);
    }
    else if (ext == ".ts" || ext == ".tsx" || ext == ".jsx")
    {
        try
        {
            const process = Deno.run(options);
            await process.status();
            try
            {
                const file = await FileFromCached(cacheDir);
                Memory.set(webDir, file);
                console.log(`File Processor: ${webDir} successfully updated.`);
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
        Memory.set(webDir, {xpiled:code});
    }
};

const FileFromCached =async(inCacheDir:string):Promise<MemoryFile>=>
{
    const code = await Deno.readTextFile(inCacheDir);
    const split = code.lastIndexOf("//# sourceMappingURL=");
    return {
        xpiled: code.substring(0, split),
        source: code.substring(split)
    };
}

// Process all files
// - look in .cached/ and push things into Memory
for await (const entry of walk(".cached", {includeDirs:false, exts:[".ts.js", ".tsx.js", ".jsx.js"]}))
{
    // entry.path ~= .cached\gen\file\C\Web Projects\amber-reloader\project\test.tsx.js
    // dirCWD ~= C:\Web Projects\amber-reloader

    const splitter = dirCWD.replace(":", "");
    const index = entry.path.indexOf(splitter);
    let webDir = entry.path.substring(index+splitter.length).replaceAll("\\", "/");
    webDir = webDir.substring(0, webDir.length-3);

    const file = await FileFromCached(entry.path);
    Memory.set(webDir, file);
}

// Process individual files as they are changed
// - look in project/ and push things into Memory and .cached/
const watcher = Deno.watchFs("project");
for await (const event of watcher)
{
    event.paths.forEach(path => filesChanged.set(path, event.kind));
    ProcessFiles();
}