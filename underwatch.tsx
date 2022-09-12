import Message from "./project/test.tsx";

console.log("dir???", Deno.env.get("DENO_DIR"));

const file = `<!doctype html>
<html>
    <head></head>
    <body>
        <h1>${Message}</h1>
        <script>
            const socket = new WebSocket('ws://localhost:4422/');
            socket.addEventListener('message', (event) =>
            {
                console.log('Message from server ', event.data);
                location.reload();
            });
        </script>
    </body>
</html>`;

Deno.serve({port:8000}, ()=> new Response(file, {status:200, headers:{"content-type":"text/html"}}));