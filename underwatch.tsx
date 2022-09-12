import { serve } from "https://deno.land/std@0.155.0/http/mod.ts";

console.log("dir???", Deno.env.get("DENO_DIR"));

globalThis.onunload = ()=> console.log("undrwatch is UNloading!");
globalThis.onload = ()=> console.log("undrwatch is loading!");

const file = `<!doctype html>
<html>
    <head></head>
    <body>
        <script>
            const socket = new WebSocket('ws://localhost:4422/');
            socket.addEventListener('message', (event) =>
            {
                console.log('Message from server ', event.data);
            });
        </script>
    </body>
</html>`;

serve( ()=> new Response(file, {status:200, headers:{"content-type":"text/html"}}));