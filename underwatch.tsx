import { serve } from "https://deno.land/std@0.155.0/http/server.ts";
import Message from "./project/test.tsx";

const file = `<!doctype html>
<html>
    <head></head>
    <body>
        <h1>${Message}</h1>
        <script type="module">
            import Reloader from "/hmr";
            import * as I from "/project/test.tsx";
            Reloader("reload-complete", ()=>
            {
                console.log(I.default);
            })
        </script>
    </body>
</html>`;

const proxy = async(inModule:string)=>
{
    const imp = await import("."+inModule);
    console.log("building proxy code with", imp);
    const members = [];
    for( const key in imp ) { members.push(key); }
    return `
import * as Import from "${inModule}?reload=0";
import Reloader from "/hmr";
${ members.map(m=>`let proxy_${m} = Import.${m}; export { proxy_${m} as ${m} };`).join(`
`) }

const reloadHandler = (updatedModule)=>
{
    ${ members.map(m=>`proxy_${m} = updatedModule.${m};`).join(`
`) }
};

Reloader("${inModule}", reloadHandler);`;

};

const hmr = `

let reloads = 0;
const socket = new WebSocket('ws://localhost:4422/');
socket.addEventListener('message', (event) =>
{
    console.log('Message from server ', event.data);
    console.log("looking for registered handlers for", event.data, "in", listeners.get(event.data));

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
    console.log("listener registered", path);
};`;

serve(
    async(inRequest)=>
    {
        const url = new URL(inRequest.url);
        
        if(url.pathname == "/favicon.ico")
        {
            return new Response("", {status:404});
        }

        if(url.pathname == "/")
        {
            return new Response(file, {status:200, headers:{"content-type":"text/html"}});
        }

        if(url.pathname == "/hmr")
        {
            console.log("serving hmr updater");
            return new Response(hmr, {status:200, headers:{"content-type":"application/javascript"}});
        }

        const reload = url.searchParams.get("reload") ? true : false;
        if(reload)
        {
            console.log("serving updated module", url.pathname);
            return new Response(localStorage.getItem(url.pathname), {status:200, headers:{"content-type":"application/javascript", "cache-control":"no-cache,no-save"}});
        }
        else
        {
            console.log("serving proxy for", url.pathname);
            const code = await proxy(url.pathname);
            return new Response(code, {status:200, headers:{"content-type":"application/javascript", "cache-control":"no-cache,no-save"}});
        }
    },
    {port:8000}
);