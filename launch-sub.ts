import { serve } from "https://deno.land/std@0.155.0/http/mod.ts";
serve( ()=> new Response("hello", {status:200}), {port:8000});