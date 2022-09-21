import { string } from "https://esm.sh/v95/@types/prop-types@15.7.5/index.d.ts";
import React from "react";

export type CacheRecord = { Data:false|string, Error:boolean, Expiry:number|false, Pending:boolean };
export type CacheQueue = Array<Promise<void>>;
export type KeyedMeta = {Title?:string, Description?:string, Image?:string, Icon?:string};
export type KeyedMetaID = {ID:string, Meta:KeyedMeta}
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
            console.log("meta replace");
            output = {...inState, Meta:inAction.payload};
            break;
        case "MetaAdd" :
        {
            console.log("meta add");
            const clone = [...inState.MetaStack];
            if(clone.length > 0)
            {
                const leading = clone[clone.length-1];
                inAction.payload.Meta = {...leading.Meta, ...inAction.payload.Meta};
            }
            clone.push(inAction.payload);
            output = { ...inState, MetaStack:clone, Meta:inAction.payload.Meta};
            break;
        }
        case "MetaRemove" :
        {
            console.log("meta remove");
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
    console.log(output.MetaStack);
    return output;
};

const Loader = async(inURL:string, inDispatcher:(inAction:Actions)=>void):Promise<void>=>
{
    let error = false;
    let text:false|string = false;
    inDispatcher({type:"DataReplace", payload:[inURL, { Data: false, Error: false, Expiry: 0, Pending: true }]});
    try
    {
        const response = await fetch(inURL);
        text = await response.text();
        if(response.status !== 200) { throw text; }   
    }
    catch(e:unknown){ error = true; }
    inDispatcher({type:"DataReplace", payload:[inURL, { Data: text, Error: error, Expiry: 0, Pending: true }]});
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

export function useMetas(arg:KeyedMeta):void;
export function useMetas():KeyedMeta;
export function useMetas(arg?:KeyedMeta):KeyedMeta|void
{   
    const [state, dispatch] = React.useContext(IsoContext);
    const id = React.useId();
    if(arg)
    {
        console.log("useMetas called", arg.Title, id);
        const action:Actions = {type:"MetaAdd", payload: {ID:id, Meta:arg }};
        if(!state.Client)
        {
            dispatch(action);

        }
        else
        {
            React.useEffect(()=>
            {
                if(state.Client)
                {
                    dispatch(action);
                    console.log("useMetas dispatching!", arg.Title, id);
                    return ()=>{dispatch({type:"MetaRemove", payload:id});};
                }
            }, []);
        }
    }
    return state.Meta;
}
export const useFetch =(url:string):CacheRecord=>
{
    const [state, dispatch] = React.useContext(IsoContext);
    const match:CacheRecord|null = state.Data[url];
    if(!match)
    {
        const pending = Loader(url, dispatch);
        if(!state.Client){ state.Queue.push(pending); }
        return { Data: false, Error: false, Expiry: 0, Pending: true };
    }
    else
    {
        return match;
    }
};


type NavigationEvent = { canTransition: boolean, destination:{url:string}, transitionWhile: ( arg:void )=>void };
const Effects =()=>
{
    const metasGet = useMetas();
    const [, routeSet] = useRoute();

    React.useEffect(()=>{ document.title = metasGet.Title??""; }, [metasGet.Title]);
    React.useEffect(()=>
    {
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
    }, []);
    return null;
};

const RouteTemplateTest =(inPath:Path, inDepth:number, inTemplate:string):false|SwitchStatus=>
{
    const url = new URL("http://h"+inTemplate);
    const path = inPath.Parts.slice(inDepth);
    const test = url.pathname.substring(1).split("/");

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
    return {Depth:test.length+inDepth, Params:vars};
}

export type SwitchStatus = {Depth:number, Params:Record<string, string>}
export const SwitchContext:React.Context<SwitchStatus> = React.createContext({Depth:0, Params:{}});
export type SwitchValue = string|number|boolean
export const Switch =({ children, value }: { children: JSX.Element | JSX.Element[]; value:SwitchValue|Path  })=>
{
    const ctx = React.useContext(SwitchContext);
	return React.useMemo(() =>
    {
		let child = <></>;
		if (!Array.isArray(children))
        {
			children = [children];
		}
        if(typeof value == "object")
        {
            for (let i = 0; i < children.length; i++)
            {
                child = children[i];
                if (child.props?.value)
                {
                    const test = RouteTemplateTest(value, ctx.Depth??0, child.props.value);
                    if(test)
                    {
                        test.Params = {...ctx.Params, ...test.Params};
                        return <SwitchContext.Provider value={test}>{child.props.children}</SwitchContext.Provider>
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
                    return child.props.children;
                }
            }
        }
        // only return the last case as a default if it has no value prop
        if(!child.props?.value)
        {
            return child.props.children;
        }
    }, [value]);
};
export const Case = (
	{ value, children }: { value?: SwitchValue; children: React.ReactNode },
) => null;
