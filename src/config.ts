/// <reference path='preferences.d.ts' />

import * as fs from 'fs';
import * as path from 'path';
import * as url from 'url';
import * as util from 'util';
import * as assert from 'assert';
import * as chalk from 'chalk';
import * as inquirer from 'inquirer';

import Preferences = require('preferences');

import { Observable, Observer, throwError, of, from } from 'rxjs';
import { flatMap, map, tap } from 'rxjs/operators';
import { Config, Credentials, PathSuffix } from './confluence';

export type ConfigAndCredentials = [Config,Credentials];

const CONFIG_FILE       = 'config.json';
const SITE_PATH         = 'site.xml'

const fs_delete = util.promisify( fs.unlink );
const fs_exists = util.promisify( fs.exists );


/**
 * 
 */
export const restMatcher = new RegExp( `(${PathSuffix.REST})$` );
/**
 * 
 */
export const xmlrpcMatcher = new RegExp( `(${PathSuffix.XMLRPC})$` );

/**
 * 
 * @param path 
 */
export function normalizePath( path:string|url.UrlObject ):string|url.UrlObject {

    if( util.isString(path) ) {
        let v = path as string;
        return v.replace( /\/+/g, '/').replace(/\/+$/, '');
    }
    if( util.isObject(path) ) {
        let v = path as url.UrlObject;
        if( v.pathname ) {
            v.pathname = v.pathname.replace( /\/+/g, '/').replace(/\/$/, '');
            return v;
        }
    }
    throw new Error('input parameter is invalid!'); 
}

function removeSuffixFromPath( path:string ) {
    return path.replace( restMatcher, '' ).replace( xmlrpcMatcher, '');
}

namespace ConfigUtils {

    /**
     * masked password
     */
    export function maskPassword( value:string ) {
        //assert.ok( !util.isNullOrUndefined(value) );
        
        return ( util.isNullOrUndefined(value) ) ? '<not set>' : Array(value.length+1).join('*') ;
    }

    /**
     * MaskedValue
     */
    export class MaskedValue {
        private _value:string;

        constructor( public value:any ) {
            this._value = ( util.isNullOrUndefined(value) ) ?  '' :
                            (util.isObject(value) ? value['_value'] : value) ;
        }

        mask() {
            return maskPassword(this._value);
        }

        toString() {
            return this.mask();
        }

        static validate( value:any ):boolean {
            if( util.isNullOrUndefined(value) ) return false;
            if( util.isObject(value) ) return MaskedValue.validate(value['_value']);
            return true;
        }

        static getValue( value:any ):string {
            assert( MaskedValue.validate(value) );
            return ( util.isObject(value) ) ? value['_value'] : value;
        }
    }


    export namespace Port {
        export function isValid(port:string|number):boolean {
        return (util.isNullOrUndefined(port) || util.isNumber(port) || Number(port) !== NaN )
        }

        export function value( port:string|number, def:number = 80 ) {
            assert( isValid(port) );

            return ( util.isNullOrUndefined(port) ) ?  def : Number( port );
        }

    }

    export namespace Url {

        export function format( config:Config ):string {

                assert( !util.isNullOrUndefined(config) );
                
                let port = util.isNull(config.port) ? '' : (config.port===80 ) ? '' : ':' + config.port
                return util.format( '%s//%s%s%s',
                                config.protocol,
                                config.host,
                                port,
                                config.path);
        }

    }


}

function version():[string,string] {
    try {
        const pkg = require( path.join(__dirname,'..', 'package.json') );
        return ['version:\t', pkg.version] 
    }
    catch( e ) {
        return ['',''];
    }
}

function printConfig( value:ConfigAndCredentials) {

    let [cfg, crd] = value ;

    let out = [
         version(),
         ['site path:\t',                    cfg.sitePath],
         ['confluence url:\t',               ConfigUtils.Url.format(cfg)],
         ['confluence space id:',            cfg.spaceId],
         ['confluence parent page:',         cfg.parentPageTitle],
         ['serverid:\t',                     String(cfg.serverId)],
         ['confluence username:',            crd.username || '<not set>'],
         ['confluence password:',            ConfigUtils.maskPassword(crd.password)]

    ]
    .reduce( (prev, curr, index, array ) => {
        let [label,value] = curr;
        return util.format('%s%s\t%s\n', prev, chalk.cyan(label as string), chalk.yellow(value as string) );
    }, '\n\n')

    console.log( out );
}

/**
 *
 */
export async function resetCredentials( serverId:string ):Promise<void> {

    let answer = await inquirer.prompt( [
            {
                type: 'confirm',
                name: 'reset',
                message: 'do you confirm credential reset?',
                default: false 
            }
        ]);

    if( answer.reset ) {
        
        const credentials = new Preferences( serverId, {}) ;

        credentials.clear()
    }


}

/**
 *
 */
export function rxConfig( force:boolean, serverId?:string ):Observable<ConfigAndCredentials> {

    let configPath = path.join(process.cwd(), CONFIG_FILE);

    let defaultConfig:Config = {
        host:'',
        path:'',
        port:-1,
        protocol:'http',
        spaceId:'',
        parentPageTitle:'Home',
        sitePath:SITE_PATH,
        serverId:serverId
    };

    let defaultCredentials:Credentials = {
        username:'',
        password:''
    };

    if( fs.existsSync( configPath ) ) {

        //console.log( configPath, 'found!' );
        
        defaultConfig = require( path.join( process.cwd(), CONFIG_FILE) );

        if( force && !util.isNullOrUndefined(serverId) ) {
            defaultConfig.serverId = serverId;
        }
        
        if( util.isNullOrUndefined(defaultConfig.serverId) ) {
            return throwError( new Error("'serverId' is not defined!"));
        }

        defaultCredentials = new Preferences( defaultConfig.serverId, defaultCredentials) ;

        if( !force ) {

            let data:ConfigAndCredentials = [ defaultConfig, defaultCredentials ];

            return of(data)
                    .pipe(tap( printConfig ));
        }
    }
    else {

        if( util.isNullOrUndefined(defaultConfig.serverId)  ) {
            return throwError( new Error("'serverId' is not defined!"));
        }
        
    }

    console.log( chalk.green('>'), chalk.bold('serverId:'), chalk.cyan(defaultConfig.serverId) );

    let answers = inquirer.prompt( [
            {
                type: 'input',
                name: 'sitePath',
                message: 'site relative path',
                default: defaultConfig.sitePath,
                validate: ( value ) => {
                    const exists = util.promisify( fs.exists );

                    return exists( path.join( process.cwd(), value ));
                }
            },
            {
                type: 'input',
                name: 'url',
                message: 'confluence url:',
                default: ConfigUtils.Url.format( defaultConfig ),
                validate: ( value ) => {
                        let p = url.parse(value);
                        //console.log( 'parsed url', p );
                        let valid = (p.protocol && p.host  && ConfigUtils.Port.isValid(p.port as string) );
                        return (valid) ? true : 'url is not valid!';
                    }
            },
            {
                type: 'list',
                name: 'suffix',
                message: 'Which protocol want to use?',
                default: () => { 
                    return ( defaultConfig.path.match(restMatcher) ) ? PathSuffix.REST : PathSuffix.XMLRPC;
                },
                //when: () => !( defaultConfig.path.match(restMatcher) || defaultConfig.path.match(xmlrpcMatcher) ),
                choices: [ 
                    { name:'xmlrpc', value:PathSuffix.XMLRPC}, 
                    { name:'rest', value:PathSuffix.REST }
                ]            
            },            
            {
                type: 'input',
                name: 'spaceId',
                message: 'confluence space id:',
                default: defaultConfig.spaceId
            },
            {
                type: 'input',
                name: 'parentPageTitle',
                message: 'confluence parent page title:',
                default:defaultConfig.parentPageTitle
            },
            {
                type: 'input',
                name: 'username',
                message: 'confluence username:',
                default: defaultCredentials.username,
                validate: ( value ) => {
                    return value.length==0 ? 'username must be specified!' : true;
                }
            },
            {
                type: 'password',
                name: 'password',
                message: 'confluence password:',
                default: new ConfigUtils.MaskedValue(defaultCredentials.password),
                validate: ( value ) => { return ConfigUtils.MaskedValue.validate(value) } ,
                filter: (value) => { return ConfigUtils.MaskedValue.getValue( value  ) }
            }

        ] );

    const rxCreateConfigFile = <T>( path:string, data:any, onSuccessReturn:T):Observable<T> => {
        return Observable.create( (observer:Observer<T>) => 
            fs.writeFile( path, data, (err) => {
                if( err ) {
                    observer.error(err);
                    return;
                }
                observer.next( onSuccessReturn );
                observer.complete();
            })
        );
    } 

    return from( answers )
                    .pipe(map( (answers:any) => {
                        let p = url.parse(answers['url']);
                        
                        let _path = normalizePath(removeSuffixFromPath(p.path || '') + (answers.suffix || '')) as string ;

                        let config:Config = {
                            path:_path,
                            protocol:p.protocol as string,
                            host:p.hostname as string,
                            port:ConfigUtils.Port.value(p.port as string),
                            spaceId:answers['spaceId'],
                            parentPageTitle:answers['parentPageTitle'],
                            sitePath:answers.sitePath,
                            serverId:defaultConfig.serverId
                        }
                        /*
                        let credentials:Credentials = {
                            username:answers['username'],
                            password:answers['password']
                        };
                        */
                        let c = new Preferences(config.serverId as string, defaultCredentials );
                        c.username = answers['username']
                        c.password = answers['password'];

                        //console.dir( config );
                        //console.dir( answers );

                        return [ config, c ] as ConfigAndCredentials;
                    }))
                    .pipe(flatMap( result =>
                        rxCreateConfigFile( configPath, JSON.stringify(result[0]), result )
                    ));

}



function main() {
    rxConfig( true )
    .subscribe( ( result ) => {

        console.dir( result, {depth:2} );
    });

}
