const template = async(inModule:string)=>
{
    const module = "./project/test.tsx";
    const imp = await import(module);
    const members = [];
    for( const key in imp ) { members.push(key); }
    return `
import * as Import from "${module}";
import Reloader from "proxy";
${ members.map(m=>`let proxy_${m} = ${m}; export { proxy_${m} as ${m} };`).join(`
`) }
const reloadHandler = (reloaded)=>
{
    ${ members.map(m=>`proxy_${m} = reloaded.${m};`).join(`
`) }
});
let reloads = 0;
Reload.onReload("${module}" ()=>
{
    reloads++;
    import("${module}?reload="+reloads).then(reloadHandler);
});`;
};

export default template;
let code = await template("./project/test.tsx");
console.log(code);