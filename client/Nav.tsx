import React from "react";
import { Branch, BranchMenu, BranchButton, useScreenSize } from "./Collapse.tsx";


const Menu =({title, children}:{title:string, children:React.ReactNode})=>
{
    return <Branch className="flex-1" away>
        <BranchButton>{title}</BranchButton>
        <BranchMenu className="md:absolute bg-black flex flex-col duration-1000">
            {children}
        </BranchMenu>
    </Branch>;
};

export default ()=>
{
    const big = useScreenSize(768);
    return <nav className="flex flex-col md:gap-5 md:flex-row">
        <h1 className="p-4 text-xl text-red-500 font-black">{big?"over 768":"under768"}</h1>
        <Menu title="Daily">
            <a className="px-3 py-2 text-sm text-white font-bold">Program</a>
            <a className="px-3 py-2 text-sm text-white font-bold">AB Devotion</a>
            <a className="px-3 py-2 text-sm text-white font-bold">CHS Devotion</a>
            <a className="px-3 py-2 text-sm text-white font-bold">Reading</a>
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