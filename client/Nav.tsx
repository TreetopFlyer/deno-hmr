import React from "react";
import { Branch, BranchMenu, BranchButton, useScreenSize } from "./Collapse.tsx";


const Menu =({title, children}:{title:string, children:React.ReactNode})=>
{
    const big = useScreenSize(768);
    return <div>
        <p>{big?"big":"not big"}</p>
        <Branch className="flex-1" away={big} open={big}>
            <BranchButton
                className="p-4 text-white bg-black transition-all duration-500"
                classActive="text-black bg-white">{title}
            </BranchButton>
            <BranchMenu className={"md:absolute bg-black flex flex-col"}>
                {children}
            </BranchMenu>
        </Branch>
    </div>;
};

export default ()=>
{
    const big = useScreenSize(768);
    return <nav className="flex flex-col md:gap-5 md:flex-row">

        <Branch open={big} away>
            <BranchButton>Hamburger Menu</BranchButton>
            <BranchMenu className="duration-1000">
                <Branch className="flex-1" away>
                    <BranchButton
                        className="p-4 text-white bg-black transition-all duration-500"
                        classActive="text-black bg-white">
                            Sermons
                    </BranchButton>
                    <BranchMenu className={"bg-black flex flex-col duration-1000 bg-red-500"}>
                        <a href="/" className="px-3 py-2 text-sm text-white font-bold">Home</a>
                        <a href="/about" className="px-3 py-2 text-sm text-white font-bold">About</a>
                        <a href="/sermons/great-commandment-part-two" className="px-3 py-2 text-sm text-white font-bold">Great commandment</a>
                    </BranchMenu>
                </Branch>
                <Branch className="flex-1" away>
                    <BranchButton
                        className="p-4 text-white bg-black transition-all duration-500"
                        classActive="text-black bg-white">
                            Programs
                    </BranchButton>
                    <BranchMenu className={"bg-black flex flex-col duration-1000"}>
                        <a href="/sermons/great-commandment-part-two" className="px-3 py-2 text-sm text-white font-bold">Great commandment</a>
                    </BranchMenu>
                </Branch>
            </BranchMenu>
        </Branch>

    </nav>
};