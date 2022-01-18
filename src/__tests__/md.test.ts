import { marked as MD } from 'marked'
import {markdown2wiki, WikiRenderer} from "../md";


const infoNoticeblock =
`
> **info:** About me
>
>> tposidufsqdf qsfpqs dfopqsdijf q
>>  mldjkflqsdif sqj
>
`

const noteNoticeblock =
`
> **Note:**
>
> Contents of my note
>
`

const tipNoticeblock =
`
> **tip:** About you
> 
> tposidufsqdf qsfpqs dfopqsdijf q
>  mldjkflqsdif sqj
>
`

const warningNoticeblock =
`
> **warning:** About him
> 
> tposidufsqdf qsfpqs dfopqsdijf q
>  mldjkflqsdif sqj
>
> - one
> - two
> 
> have a **strong** and _pure_ feeling
`

const cheatsheet = 
`
# header1
**bold**
_italic_
~strikethrough~
\`the code\`
> blockquote1
> blockquote2
  
[github](https://github.com/bsorrentino/confluence-site-publisher)

***  
  
![alt text](https://github.com/adam-p/markdown-here/raw/master/src/common/images/icon48.png "Logo Title Text 1")
  
\`\`\`javascript
java script code
\`\`\`
  
Markdown | Less | Pretty
--- | --- | ---
*Still* | \`renders\` | **nicely**
1 | 2 | 3

* u1
* u2
* u3

1. o1
1. o2
1. o3
`

describe( 'MARKDOWN TEST', () => {

/**
 * 
 */
test( 'marked notice block test: Warning with complex content ', () => {

const result =  markdown2wiki( warningNoticeblock );

console.log( result )
    
expect( result ).toBe(
`{warning|title=About him}


 tposidufsqdf qsfpqs dfopqsdijf q
  mldjkflqsdif sqj

* one
* two

 have a *strong* and _pure_ feeling


{warning}`
)})
    
/**
 * 
 */
test( 'marked notice block test: info with title', () => {

const result =  markdown2wiki( infoNoticeblock );

//console.log( result )

expect( result ).toBe(
`{info|title=About me}

{quote}tposidufsqdf qsfpqs dfopqsdijf q
 mldjkflqsdif sqj

{quote}


{info}`
)})

/**
 * 
 */
test( 'marked notice block test: note without title ', () => {

const result =  markdown2wiki( noteNoticeblock );

//console.log( result )

expect( result ).toBe(
`{Note|title=}


 Contents of my note


{Note}`
)})

/**
 * 
 */
test( 'marked notice block test: tip with title', () => {

const result =  markdown2wiki( tipNoticeblock );

//console.log( result )

expect( result ).toBe(
`{tip|title=About you}


 tposidufsqdf qsfpqs dfopqsdijf q
  mldjkflqsdif sqj


{tip}`
)})
    


/**
 * 
 */
test( 'markdown test 0', /*async*/ () => {

    //expect.assertions(1);

    const result =  markdown2wiki( cheatsheet ).split('\n').filter( l => l.length > 0);

    let i = 0;
    expect( result ).toHaveLength(23);
    expect( result[i++]).toBe( 'h1. header1');
    expect( result[i++]).toBe( '*bold*');
    expect( result[i++]).toBe( '_italic_');
    expect( result[i++]).toBe( '-strikethrough-');
    expect( result[i++]).toBe( '{{the code}}');
    expect( result[i++]).toBe( '{quote}blockquote1');
    expect( result[i++]).toBe( 'blockquote2');
    expect( result[i++]).toBe( '{quote}');
    expect( result[i++]).toBe( '[github|https://github.com/bsorrentino/confluence-site-publisher]');
    expect( result[i++]).toBe( '----');
    expect( result[i++]).toBe( '!https://github.com/adam-p/markdown-here/raw/master/src/common/images/icon48.png!');
    expect( result[i++]).toBe( '{code:javascript}');
    expect( result[i++]).toBe( 'java script code');
    expect( result[i++]).toBe( '{code}');
    expect( result[i++]).toBe( '||Markdown||Less||Pretty||');
    expect( result[i++]).toBe( '|_Still_|{{renders}}|*nicely*|');
    expect( result[i++]).toBe( '|1|2|3|');
    expect( result[i++]).toBe( '* u1');
    expect( result[i++]).toBe( '* u2');
    expect( result[i++]).toBe( '* u3');
    expect( result[i++]).toBe( '# o1');
    expect( result[i++]).toBe( '# o2');
    expect( result[i++]).toBe( '# o3');
    

})

    test.skip( 'marked customization test', () => {
        type Blockquote = MD.Tokens.Blockquote

        const mytokenizer = { 

            blockquote: (src: string):Blockquote|boolean => {

                const pattern = />\s+[*][*]([Ww]arning|[Nn]ote|[Ii]nfo|[Tt]ip)[:][*][*]\s*(.*)$/

                const lines = src.split('\n')
                
                const rxResult = pattern.exec(lines[0])
                if( rxResult ) {

                    lines[0] = `{${rxResult[1]}|title=${rxResult[2]}}`         

                    const decreaseQuoteLevel = (l:string) => {
                        const r = /(\s*>)(.*)/g.exec(l)
                        return (r) ? r[2] : l
                    }
            
                    const text = lines.map( decreaseQuoteLevel ).join('\n')
                            
                    return {
                        type: 'blockquote',
                        raw: src,
                        text: text,
                        tokens: MD.lexer( text )
                    } 
                }

                return false
            }
    
        }

        MD.use( {
            tokenizer: <any>mytokenizer
        })

        const result =  MD.parse(infoNoticeblock.toString(), { 
            renderer: new WikiRenderer( {} )
            
        })

        console.log( 'RESULT', result )
    })

    /*
    test( 'markdown test 1', async () => {
        expect.assertions(1);

        let file = path.join( process.cwd(), "site", "demo1.md" );

        const buff = await readFile( file );
    
        expect( buff ).not.toBeNull();

        console.log( markdown2wiki( buff ) );
    
    })

    test( "readme2confluenceTest", async () => {
        expect.assertions(1);

        let file = path.join( process.cwd(), "README.md" );
    
        const buff = await readFile( file );
    
        expect( buff ).not.toBeNull();

        console.log( markdown2wiki( buff ) );
    
    })
    */
})
