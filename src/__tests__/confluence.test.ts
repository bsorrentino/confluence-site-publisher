
import * as url from 'url';
import { normalizePath } from "../config";
import { BaseConfig } from '../confluence';

import * as util from 'util';
import * as fs from "fs";
import * as path from "path";
import * as xml from "xml2js";
import {markdown2wiki} from "../md";

describe( 'MARKDOWN TEST', () => {


    const readFile = util.promisify( fs.readFile );

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


    test( "xmlParse()", async ( done ) => {
        let parser = new xml.Parser();
        let file = path.join( process.cwd(), "site", "site.xml" );
    
        
        const buff = await readFile( file );
    
        expect( buff ).not.toBeNull();
     
        parser.parseString(buff.toString(), (err:any, result:any) => {
            
                console.dir( result, { depth: 4 } );
                done();
        });
    
    })
    

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
