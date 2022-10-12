import { string } from "https://esm.sh/v95/@types/prop-types@15.7.5/index.d.ts";
import { useEffect } from "https://esm.sh/v95/@types/react@18.0.18/index.d.ts";
import React from "react";

export type CacheRecord = { Data:false|string|unknown, Error:boolean, Expiry:number|false, Pending:boolean, JSON?:unknown };
export type CacheQueue = Array<Promise<void>>;
export type KeyedMeta = {Title?:string, Description?:string, Image?:string, Icon?:string};
export type KeyedMetaID = {ID:string, Meta:KeyedMeta, Time:number}
export type KeyedData = {[key:string]:CacheRecord};
export type Path = {
    Parts:Array<string>,
    Query:{[key:string]:string},
    Hash:string
};
export type State = { Meta:KeyedMeta, MetaStack:Array<KeyedMetaID>, Data:KeyedData, Path:Path, Client:boolean, Queue:CacheQueue };
export type Actions
= {type: "MetaReplace", payload: KeyedMeta }
| {type: "MetaAdd", payload: KeyedMetaID }
| {type: "MetaRemove", payload: string }
| {type: "DataReplace", payload: [key:string, value:CacheRecord] }
| {type: "PathReplace", payload: Path }

export type IsoBinding = [State, React.Dispatch<Actions>];

export type ShellComponent = (props:{isoModel:State, styles:string, importMap:string, bake:string, init:string})=>JSX.Element;
export type AppComponent = ()=>JSX.Element;

const InitialState:State = {
    Meta:{},
    MetaStack:[],
    Data:{},
    Path:{Parts:[""], Query:{}, Hash:""},
    Client:false,
    Queue:[]
};
const Reducer =(inState:State, inAction:Actions)=>
{
    let output = inState;
    switch(inAction.type)
    {
        case "PathReplace" :
            output =
            {
                ...inState,
                Path:
                {
                    Parts: inAction.payload.Parts??inState.Path.Parts,
                    Hash: inAction.payload.Hash??inState.Path.Hash,
                    Query: 
                    {
                        ...inState.Path.Query,
                        ...inAction.payload.Query
                    }
                }
            };
            break;
        case "DataReplace" :
            output = { ...inState, Data: { ...inState.Data, [inAction.payload[0]]: inAction.payload[1] } };
            break;
        case "MetaReplace" :
            output = {...inState, Meta:inAction.payload};
            break;
        case "MetaAdd" :
        {
            if(inState.MetaStack.length > 0)
            {
                const leading = inState.MetaStack[inState.MetaStack.length-1];
                inAction.payload.Meta = {...leading.Meta, ...inAction.payload.Meta};
            }
            inState.MetaStack.push(inAction.payload);
            inState.MetaStack.sort((a, b)=>{
                return a.Time - b.Time;
            });
            const leading = inState.MetaStack[inState.MetaStack.length-1].Meta;
            output = { ...inState, Meta:{...leading}};
            break;
        }
        case "MetaRemove" :
        {
            const clone = [...inState.MetaStack];
            for(let i=0; i<clone.length; i++)
            {
                if(clone[i].ID == inAction.payload)
                {
                    clone.splice(i, 1);
                    break;
                }
            }
            output = { ...inState, MetaStack:clone };
            if(clone.length > 0)
            {
                output.Meta = clone[clone.length-1].Meta;
            }
            break;
        }
    }
    return output;
};

export const PathParse =(route:URL)=>
{
    const query:{[key:string]:string} = {};
    route.searchParams.forEach((value, key, obj)=>query[key] = value);
    return {
        Parts: route.pathname.substring(1).split("/"),
        Hash: route.hash.substring(1),
        Query: query 
    };
}

export const IsoContext:React.Context<IsoBinding> = React.createContext([InitialState, inAction=>{}]);
export const IsoProvider =({seed, children}:{seed:State, children:React.ReactNode})=>
{
    const binding:IsoBinding = seed.Client ? React.useReducer(Reducer, seed) : [seed, (inAction:Actions)=>
    {
        const clone = Reducer(seed, inAction);
        seed.Data = clone.Data;
        seed.Meta = clone.Meta;
        seed.Path = clone.Path;
    }];
    return <IsoContext.Provider value={binding}>
        <Effects/>
        {children}
    </IsoContext.Provider>;
};

export function useRoute():[get:Path, set:(path:Path)=>void]
{   
    const [state, dispatch] = React.useContext(IsoContext);
    return [state.Path, (arg:Path)=>dispatch({type:"PathReplace", payload: arg })];
}

let useMetaOrder = 0;
export function useMetas(arg?:KeyedMeta):KeyedMeta
{   
    const [state, dispatch] = React.useContext(IsoContext);
    const id = React.useId();
    const stamp = ++useMetaOrder;

    if(arg)
    {
        const action:Actions = {type:"MetaAdd", payload: { ID:id, Meta:arg, Time:stamp }};
        if(!state.Client)
        {
            dispatch(action);
        }
        React.useEffect(()=>
        {
            if(state.Client)
            {
                dispatch(action);
                return ()=>
                {
                    dispatch({type:"MetaRemove", payload:id});
                };
            }
        }, []);
    }

    return state.Meta;
}
export const Metas =({title, descr, image}:{title?:string, descr?:string, image?:string})=>
{
    const metas:KeyedMeta = {};
    if(title){metas.Title = title;}
    if(descr){metas.Description = descr;}
    if(image){metas.Image = image;}
    useMetas(metas);
}


type ParsedCacheRecord = CacheRecord & {JSON?:false|unknown}
type FetchOptions = {proxy?:boolean, parse?:boolean}
export const useFetch =(url:string, options?:FetchOptions):ParsedCacheRecord=>
{
    const [state, dispatch] = React.useContext(IsoContext);
    const parsed = React.useRef(null);

    const fetchOptions = {proxy:true, parse:true, ...options};
    const fetchURL = (fetchOptions.proxy && state.Client) ? "/proxy/"+encodeURIComponent(url) : url;

    const match:ParsedCacheRecord|null = state.Data[url];
    if(!match)
    {
        let error = false;
        let text:false|string = false;
        dispatch({type:"DataReplace", payload:[url, { Data: false, Error: false, Expiry: 0, Pending: true }]});

        const pending = fetch(fetchURL)
        .then(response=>
        {
            if(response.status !== 200) { throw text; } 
            return response.text()
        })
        .then(parsed=>
        {
            text = parsed;
        })
        .catch((e:unknown)=>
        {
            error = true;
            console.log("fetch error", e, fetchURL);
        })
        .finally(()=>
        {
            dispatch({type:"DataReplace", payload:[url, { Data: text, Error: error, Expiry: 0, Pending: false }]});
        })
              
        if(!state.Client){ state.Queue.push(pending); }
        return { Data: false, Error: false, Expiry: 0, Pending: true, JSON:false };
    }
    else
    {
        if(parsed.current)
        {
            match.JSON = parsed.current;
        }
        else
        {
            if(fetchOptions.parse !== false && typeof match.Data == "string")
            {
                parsed.current = JSON.parse(match.Data);
                match.JSON = parsed.current;
            }
        }
        return match;
    }
};
export const Fetch =({url, fallback, children}:{url:string, fallback?:JSX.Element, children:(json:unknown|false)=>JSX.Element}):JSX.Element=>
{
    const fetch = useFetch(url, {proxy:true, parse:true});

    if(fetch.Pending && fallback)
    {
        return fallback;
    }
    else
    {
        console.log(children);
        return children(fetch.JSON);
    }
}

type NavigationEvent = { canTransition: boolean, destination:{url:string}, transitionWhile: ( arg:void )=>void };
const Effects =()=>
{
    const metasGet = useMetas();
    const [, routeSet] = useRoute();

    React.useEffect(()=>{ document.title = metasGet.Title??""; }, [metasGet.Title]);
    React.useEffect(()=>
    {
        window.addEventListener("popstate", (e)=>
        {
            const u = new URL(document.location.href);
            const p = PathParse(u);
            routeSet(p);
        })
        document.addEventListener("click", (e:MouseEvent)=>
        {
            const path = [e.target];
            let pathStep:HTMLAnchorElement = e.target as HTMLAnchorElement;
            while(pathStep.parentElement && pathStep.parentElement != document.body)
            {
                if(pathStep.hasAttribute("href"))
                {
                    e.preventDefault();

                    const u = new URL(pathStep.href);
                    const p = PathParse(u);
                    routeSet(p);

                    history.pushState({path:p}, "", pathStep.href);
                    break;
                }
                pathStep = pathStep.parentElement as HTMLAnchorElement;
                path.push(pathStep);
            }
        });

        /*
        someday...
        if(navigation)
        {
            const NavigationHandler = (e:NavigationEvent) =>
            {
                if(e.navigationType !== "reload")
                {
                    const u = new URL(e.destination.url);
                    const p = PathParse(u);
                    e.transitionWhile( routeSet(p) );
                }
            };
            navigation.addEventListener("navigate", NavigationHandler);
            return ()=>navigation.removeEventListener("navigate", NavigationHandler);
        }
        */

    }, []);
    return null;
};

const RouteTemplateTest =(inPath:Path, inDepth:number, inTemplate:string):false|SwitchStatus=>
{
    const url = new URL("http://h"+inTemplate);
    const test = url.pathname.substring(1).split("/");
    const path = inPath.Parts.slice(inDepth);

    const vars:Record<string, string> = {};
    if(test.length > path.length)
    {
        return false;
    }
    for(let i=0; i<test.length; i++)
    {
        const partTest = test[i];
        const partPath = path[i];
        if(partTest[0] == ":")
        {
            vars[partTest.substring(1)] = partPath;
        }
        else if(partTest != partPath)
        {
            return false;
        }
    }
    return {Depth:inDepth+test.length, Params:vars, Base:"/"+inPath.Parts.slice(0, inDepth+test.length).join("/")};
}
export const usePath =():SwitchStatus=>
{
    return React.useContext(SwitchContext);
};
export const Path =({param}:{param:string}):JSX.Element|null=>
{
    return <>{React.useContext(SwitchContext).Params[param]}</>??null;
};

export type SwitchStatus = {Depth:number, Params:Record<string, string>, Base:string};
export const SwitchContext:React.Context<SwitchStatus> = React.createContext({Depth:0, Params:{}, Base:"/"});
export type SwitchValue = string|number|boolean
export const Switch =({ children, value }: { children: JSX.Element | JSX.Element[]; value?:SwitchValue  })=>
{
    const ctx = React.useContext(SwitchContext);
    const getChildren =(inChild:JSX.Element):JSX.Element=>
    {
        return inChild.props.__args ? inChild.props.__args.slice(2)??null : inChild.props.children??null;
    }

    let child = <></>;
    if (!Array.isArray(children))
    {
        children = [children];
    }
    if(!value)
    {
        const [route] = useRoute();
        for (let i = 0; i < children.length; i++)
        {
            child = children[i];
            if (child.props?.value)
            {
                const test = RouteTemplateTest(route, ctx.Depth??0, child.props.value);
                if(test)
                {
                    test.Params = {...ctx.Params, ...test.Params};
                    return <SwitchContext.Provider value={test}>{getChildren(child)}</SwitchContext.Provider>
                }
            }
        }
    }
    else
    {
        for (let i = 0; i < children.length; i++)
        {
            child = children[i];
            if (child.props?.value == value)
            {
                return getChildren(child);
            }
        }
    }
    // only return the last case as a default if it has no value prop
    if(!child.props?.value)
    {
        return getChildren(child);
    }
    else
    {
        return null;
    }

};
export const Case = ({ value, children }: { value?: SwitchValue; children: React.ReactNode }) => null;
