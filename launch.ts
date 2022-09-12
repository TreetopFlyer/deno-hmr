const args = {cmd:["deno", "run", "-A", "launch-sub.ts"]};
let Server:Deno.Process<Deno.RunOptions>|undefined;
Server = Deno.run(args);
setTimeout(()=>
{
    console.log("shutting it down");
    Server?.kill("SIGTERM");
    Server?.close();
    console.log("back up again");
    Server = Deno.run(args);
}
, 3000);

setTimeout(()=>
{
    console.log("shutting it down");
    Server?.kill("SIGTERM");
    Server?.close();
    console.log("back up again");
    Server = Deno.run(args);
}
, 8000);
setTimeout(()=>
{
    console.log("off for good");
    Server?.kill("SIGTERM");
    Server?.close();
}
, 20000);