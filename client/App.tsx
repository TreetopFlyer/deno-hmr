import React from "react";
import { useFetch, useRoute, Switch, Case, Metas } from "amber";
import Blog from "./Blog.tsx";
import Nav from "./Nav.tsx";

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

export default ()=>
{   
    const Sermons = useFetch(`https://truthforlife.org/resources/sermons/recent/json/`, {proxy:true});

    return <div>
        <Metas title="A Website"/>
        <Nav/>
        <Switch>
            <Case value="/">
                <Metas title="Home"/>
                <p>home page!!!</p>
                <Switch value={Sermons.Pending}>
                    <Case value={true}>Loading...</Case>
                    <Case>{Sermons.JSON && Sermons.JSON[0].title} </Case>
                </Switch>
            </Case>
            <Case value="/sermons/:slug">
                <Metas title="Home"/>
            </Case>
            <Case>
                <p className="text-lg text-red-500">404!</p>
            </Case>
        </Switch>

    </div>;
};