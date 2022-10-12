import React from "react";
import { usePath, Switch, Case, Metas, Fetch } from "amber";
import Nav from "./Nav.tsx";


type VideoState = {video:{file:string, name:string, page:string, time:number}|false, open:boolean};
type VideoStateBinding = [state:VideoState, update:React.Dispatch<React.SetStateAction<VideoState>>];
const VideoContext = React.createContext([{video:false, open:false} as VideoState, (inState:VideoState)=>{}] as VideoStateBinding);
export const useVideo =()=>
{
    const [getVideo, setVideo] = React.useContext(VideoContext);
    return (inFile:string, inPage:string, inName:string, inTime=0)=>setVideo(
        {
            open: getVideo.open,
            video:
            {
                file:inFile,
                name:inName,
                page:inPage,
                time:inTime
            }
        }
    );
};
const Player =()=>
{
    const [videoGet, videoSet] = React.useContext(VideoContext);

    return <div className="block fixed bottom-0 left-0">
        { videoGet.video?.file &&
        <div className="max-w-xl">
            <button className="p-2 bg-black text-white" onClick={e=>videoSet({...videoGet, video:false})}>close</button>
            <h3 className="bg-white p-2">{videoGet.video.name}</h3>
            <video autoplay key={videoGet.video.file} className="w-full h-auto" controls>
                <source src={videoGet.video.file} type="video/mp4"/>
            </video>
        </div>
        }
    </div>;
};

    /*
    audio_duration: 2574
audio_url: "https://tflmedia-new.s3.amazonaws.com/free_downloads/3565-thegreatcommandmentpartone.mp3"
has_transcript: true
id: 4055
image: "/static/uploads/resource_banners/3565Social_Youtube.jpg"
poster_image: "/static/uploads/resource_banners/audio-generic-playerimage2.jpg"
preach_date: "2022-09-25"
published_on: "2022-09-26"
resource_description: 
"When Jesus issued the Great Commandment—to love the Lord with all your heart, mind, and soul and to love your neighbor as yourself—He wasn’t reducing the Ten Commandments to two. Rather, He was teaching that all of God’s law hangs on those two concerns. Alistair Begg walks us through the role of the law in the believer’s life, explaining that when the Holy Spirit fills our hearts with God’s love, then we’ll follow His rules—not to receive rewards or avoid penalties but because we love Him."
resource_id_number: "3565"
resource_type: "sermon"
scripture: [{reference: "Matthew 22:34-40", start_chapter: 22, start_book: "matthew", end_book: "matthew",…}]
series: null
slug: "great-commandment-part-one"
title: "The Great Commandment — Part One"
topics: [,…]
transcript: "<p>I invite you to turn with me to Exodus and to 
url: "https://www.truthforlife.org/resources/sermon/great-commandment-part-one/"
video_duration: 2538
video_poster_image: "/static/uploads/resource_banners/video-generic-playerimage2.jpg"
video_url: "https://tflmedia-new.s3.amazonaws.com/video/high/3565-thegreatcommandmentpartone.mp4"
    */

const Subpage =()=>
{   
    const play = useVideo();
    const { Params } = usePath();

    return <div>
        <Fetch url={`https://truthforlife.org/resources/sermons/${Params.slug}/json/`} fallback={<p>"loading..."</p>}>
            {(json)=>
            {
                return <div className="max-w-2xl mx-auto p-3">
                    <Metas title={json.title}/>
                    <h3 className="text-2xl font-black">{json.title}</h3>
                    <img className="block w-full h-auto" src={`https://truthforlife.org`+json.image}/>
                    <button onClick={e=>play(json.video_url, "", json.title)}>Play</button>
                    <div dangerouslySetInnerHTML={{__html:json.transcript}}></div>
                </div>
            }}
        </Fetch>
    </div>;
};

const MainPage =()=>
{
    return <div>
        <Metas title="Home Page"/>
        <h3 className="my-2 text-xl font-sans font-black">Sermons</h3>
        <div className="flex flex-row overflow-visible">
            <Fetch url="https://truthforlife.org/resources/sermons/recent/json/" fallback={<p>Loading</p>}>
                {(sermons)=>
                {
                    return sermons.map(s=><a href={`/sermons/${s.slug}`}>
                        <img className="block w-full h-auto max-w-sm" src={`https://truthforlife.org`+s.image} />
                        <div className="p-2">
                            <div>{s.title}</div>
                            <div>{s.preach_date}</div>
                        </div>
                    </a>)
                }}
            </Fetch>
        </div>
    </div>
};

export default ()=>
{   
    const videoBinding:VideoStateBinding = React.useState({video:false, open:true} as VideoState);

    return <div>
        <Metas title="A Website"/>
        <VideoContext.Provider value={videoBinding}>
            <Nav/>
            <Switch>
                <Case value="/">
                    <MainPage/>
                </Case>
                <Case value="/sermons/:slug">
                    <Subpage/>
                </Case>
                <Case>
                    <p className="text-lg text-red-500">404!</p>
                </Case>
            </Switch>    
            <Player/>        
        </VideoContext.Provider>
    </div>;
};