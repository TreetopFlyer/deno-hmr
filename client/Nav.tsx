import React from "react";
import { Branch, BranchMenu, BranchButton, useScreenSize } from "./Collapse.tsx";


const Menu =({title, children}:{title:string, children:React.ReactNode})=>
{
    return <Branch className="flex-1" away>
        <BranchButton
            className="p-4 text-white bg-black transition-all duration-500"
            classActive="text-black bg-white">{title}
        </BranchButton>
        <BranchMenu className={"md:absolute bg-black flex flex-col"}>
            {children}
        </BranchMenu>
    </Branch>;
};

export default ()=>
{
    const big = useScreenSize(768);
    return <nav className="flex flex-col md:gap-5 md:flex-row">
        <h1 className="p-4 text-xl text-red-500 font-black">{big?"over 768":"under768"}</h1>
        <Menu title="Go To">
            <a href="/" className="px-3 py-2 text-sm text-white font-bold">Home</a>
            <a href="/about" className="px-3 py-2 text-sm text-white font-bold">About</a>
            <a href="/sermons/great-commandment-part-two" className="px-3 py-2 text-sm text-white font-bold">Great commandment</a>
        </Menu>
        <Branch className="flex-1" away>
            <BranchButton>Sermons</BranchButton>
            <BranchMenu className="md:absolute bg-red-500 flex flex-col gap-1 rounded-lg">
                <a>Latest</a>
                <a>Archives</a>
                <a>Topics</a>
            </BranchMenu>
        </Branch>
        <Branch className="flex-1" away>
            <BranchButton>Bible</BranchButton>
            <BranchMenu className="md:absolute bg-red-500 flex flex-col gap-1 rounded-lg">
                <a>C.H. Spurgeon</a>
                <a>Alistair Begg</a>
            </BranchMenu>
        </Branch>
    </nav>
};