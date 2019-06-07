
import * as url from 'url';
import { normalizePath } from "../config";
import { BaseConfig, PathSuffix } from '../confluence';

import * as util from 'util';
import * as fs from "fs";
import * as path from "path";
import * as xml from "xml2js";
import {markdown2wiki} from "../md";

import YAML = require('yaml');

const readFile = util.promisify( fs.readFile );


test( "xmlrpc path match", () => {

    let xmlrpcMatcher = new RegExp( `(${PathSuffix.XMLRPC})$` );
    let restMatcher = new RegExp( `(${PathSuffix.REST})$` );
    expect( "http://localhost/".match(xmlrpcMatcher) ).toBeFalsy();
    expect( "http://localhost/".match(restMatcher) ).toBeFalsy();
    expect( `http://localhost/${PathSuffix.XMLRPC}`.match(xmlrpcMatcher) ).toBeTruthy
    expect( `http://localhost/${PathSuffix.REST}`.match(restMatcher) ).toBeTruthy();

})

describe( 'MARKDOWN TEST', () => {
    test( 'markdown test 0', /*async*/ () => {
        //expect.assertions(1);

        const md = 
`
# header1
**bold**
_italic_
~strikethrough~
\`the code \`
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

describe( "URL TEST", () => {


    test( "url formatting with template string", () => {
        const c:BaseConfig = {
            host: "localhost",
            port: -1,
            protocol: "http",
            path: "/confluence/"
        }
        const port = (Number(c.port) > -1 ) ? ':' + c.port : '' ; 

        expect( `${c.protocol + port}`).toEqual("http");
        expect( `${c.protocol + '://' + c.host + port + '/' + c.path }`).toEqual("http://localhost//confluence/");
        
        
    })

    test( "url formatting with urlobject and port invalid", () => {
        const c:url.UrlObject = {
            host: "localhost",
            port: -1,
            protocol: "http",
            pathname: "/confluence/"
        }
        expect( url.format(c) ).toEqual("http://localhost/confluence/");
        
        
    })
    test( "url formatting with urlobject and port valid", () => {
        const c:url.UrlObject = {
            hostname: "localhost",
            port: 8088,
            protocol: "http",
            pathname: "/confluence/"
        }
        expect( url.format(c) ).toEqual("http://localhost:8088/confluence/");
        
        c.pathname = 'confluence//';
        expect( url.format(c) ).toEqual("http://localhost:8088/confluence//");
        expect( url.format( normalizePath(c) )).toEqual("http://localhost:8088/confluence");

        c.pathname = 'confluence//rest/api';
        
        expect( url.format( c )).toEqual("http://localhost:8088/confluence//rest/api");
        const u = new url.URL( url.format(c) );
        expect( u.toString() ).toEqual( "http://localhost:8088/confluence//rest/api" );

        expect( url.format( normalizePath(c) )).toEqual("http://localhost:8088/confluence/rest/api");



    })


});

describe( 'XML TEST', () => {

    test( "xmlParse()", async ( done ) => {
        let parser = new xml.Parser();
        let file = path.join( process.cwd(), "site", "site.xml" );
    
        
        const buff = await readFile( file );
    
        expect( buff ).not.toBeNull();
     
        parser.parseString(buff.toString(), (err:any, result:any) => {
            
            expect( result ).not.toBeNull();
            console.dir( result, { depth: 4 } );

            const home = result['bsc:site']['home'];
            expect( home ).toBeInstanceOf(Array);
            expect( home.length ).toEqual(1);

            console.dir( home, { depth: 4 } );
            
            done();
        });
    
    })
 
});

describe( 'YAML TEST', () => {

    test( "yaml parse", async () => {
        const  filePath = path.join( process.cwd(), "site", "site.yml" );
        const file = await readFile( filePath );
        const content = YAML.parse( file.toString(), { } );
    
        expect( content ).not.toBeNull();
        expect( content.home ).not.toBeNull();
        expect( content.home.name ).toEqual('the first');
        expect( content.home.attachments ).toBeInstanceOf( Array );
        expect( content.home.attachments.length ).toEqual(1);
        expect( content.home.children ).toBeInstanceOf( Array );
        expect( content.home.children.length ).toEqual(2);

        
    
    })

})



