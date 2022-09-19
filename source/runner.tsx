
import * as FS from "https://deno.land/std@0.144.0/fs/mod.ts";

type CloneChecker = {path:string, found:boolean, text:false|string};

const baseDir = import.meta.url.split("/").slice(0, -2).join("/");

const checkFor =async(inPath:string, inContent?:string):Promise<CloneChecker>=>
{
    const output:CloneChecker = {path:inPath, found:false, text:false};
    try
    {
        await Deno.lstat(inPath);
        output.found = true;
    }
    catch(e)
    {
        if(inContent)
        {
            output.text = inContent;
        }
        else
        {
            const url = baseDir+"/"+inPath;
            console.log(inPath, "doesnt exist yet downloading from", url);
            const file = await fetch(url);
            output.text = await file.text();
        }

    }
    return output;
};

const initialArg = Deno.args[0] ?? "-h";

if(initialArg == "init")
{
    Promise.all([
        checkFor("client/App.tsx"),
        checkFor("client/Deep.tsx"),
        checkFor("client/Search.tsx"),
        checkFor("static/Logo.svg"),
        checkFor("deno.json", `{
    "importMap": "./imports.json",
    "tasks":
    {
        "runner": "deno install -A -r --unstable -f -n amber ${baseDir}/source/runner.tsx",
        "create": "deno run -A --unstable --config=deno.json ${baseDir}/source/create.tsx",
        "server": "deno run -A --unstable --config=deno.json ${baseDir}/source/create.tsx --server --deploy=8080"
    }
}
`),
        checkFor("imports.json", `{
    "imports":
    {
                "react": "https://esm.sh/react@18.2.0",
           "react-dom/": "https://esm.sh/react-dom@18.2.0/",
                "amber": "${baseDir}/source/client.tsx"
    }
}
`),
        checkFor("twind.tsx"),
        checkFor(".vscode/settings.json")
    ]).then(values=>
    {

        console.log(baseDir);
        const encoder = new TextEncoder();
        values.forEach(async(checker)=>
        {
            if(!checker.found && checker.text)
            {
                console.log("wiritng file", checker.path);
                await FS.ensureFile(checker.path);
                Deno.writeFile(checker.path, encoder.encode(checker.text));
            }
        });
    });
}
else if(initialArg == "create" || initialArg == "server")
{
    const process = Deno.run({cmd:["deno", "task", initialArg]});
    await process.status();
}
else if(initialArg == "upgrade")
{
    const process = Deno.run({cmd:["deno", "install",  "-A", "-r", "--unstable", "-f", "-n", "amber", `${baseDir}/source/runner.tsx`]});
    await process.status();
}
else if(initialArg == "-h")
{
    console.log(`
amber init    : scaffold a new project
amber create  : launch the project in dev mode
amber server  : start the production server
amber upgrade : re-load the latest amber cli  
amber -h      : show this help screen
`);
}