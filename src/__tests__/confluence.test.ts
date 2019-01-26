
import * as url from 'url';
import { normalizePath } from "../config";
import { BaseConfig } from '../confluence';


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
