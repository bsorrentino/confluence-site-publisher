
import {markdown2wiki} from "../md";

const md = 
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
    test( 'markdown test 0', /*async*/ () => {
        //expect.assertions(1);

        const result =  markdown2wiki( md ).split('\n').filter( l => l.length > 0);
        //const result =  markdown2wiki( md ).split('\n');

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
