const stroke = {
    "stroke": "3px",
    "stroke-half": "1.5px"
};
export default 
{
    preflight:
    {
        "@import": `url('https://fonts.googleapis.com/css2?family=Nunito+Sans:wght@200;400;900&display=swap')`
    },
    theme:
    {
        extend:
        {
            colors:
            {
                "coal":"#333",
                "denim": "#153b6a"
            },
            fontFamily:
            {
                sans: ["Nunito"]
            },
            spacing:{...stroke},
            borderWidth:{...stroke}
        }
    },
    plugins:
    {
        "no-t":{"border-top-color":"transparent"},
        "no-r":{"border-right-color":"transparent"},
        "no-b":{"border-bottom-color":"transparent"},
        "no-l":{"border-left-color":"transparent"}
    }
}