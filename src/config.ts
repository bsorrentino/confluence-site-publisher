/// <reference path='preferences.d.ts' />

import * as fs from 'fs';
import * as path from 'path';
import * as url from 'url';
import * as util from 'util';
import * as assert from 'assert';
import * as chalk from 'chalk';
import * as inquirer from 'inquirer';

import Preferences = require('preferences');

import { Config, ConfigItem, ConfigItemAndCredentials, PathSuffix } from './confluence';

const CONFIG_FILE       = 'config.json';
const SITE_PATH         = 'site.xml'
const CREDENTIALS_EMPTY = {
    username:'',
    password:''
}
const fs_delete = util.promisify( fs.unlink );
const fs_exists = util.promisify( fs.exists );
const fs_writeFile = util.promisify( fs.writeFile );


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

    if( typeof path === 'string' ) {
        let v = path as string;
        return v.replace( /\/+/g, '/').replace(/\/+$/, '');
    }
    if( path !== null && typeof path === 'object' ) {
        let v = path as url.UrlObject;
        if( v.pathname ) {
            v.pathname = v.pathname.replace( /\/+/g, '/').replace(/\/$/, '');
            return v;
        }
    }
    throw new Error('input parameter is invalid!'); 
}

/**
 * 
 * @param path 
 * @returns 
 */
export function removeSuffixFromPath( path:string ) {
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

        export const value = ( port:string|number|undefined, defaultValue:number  ) => 
            ( port === null || port === undefined || port <= 0 ) ? defaultValue : Number( port )

    }

    export namespace Url {

        export function format( config:ConfigItem ):string {
                
                let port = config.port===null ? '' : (config.port===80 ) ? '' : ':' + config.port
                return util.format( '%s//%s%s%s',
                                config.protocol,
                                config.host,
                                port,
                                config.path);
        }

    }


}

export function version():string {
    try {
        const pkg = require( path.join(__dirname,'..', 'package.json') );
        return pkg.version 
    }
    catch( e ) {
        return ''
    }
}

function printConfigItem( value:ConfigItemAndCredentials) {

    let [cfg, crd] = value ;

    let out = [
         //version(),
         ['serverid:\t',                     String(cfg.serverId)],
         ['site path:\t',                    cfg.sitePath],
         ['confluence url:\t',               ConfigUtils.Url.format(cfg)],
         ['confluence space id:',            cfg.spaceId],
         ['confluence parent page:',         cfg.parentPageTitle],
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

export async function printConfig( serverId?:string ):Promise<void> {

    const configPath = path.join(process.cwd(), CONFIG_FILE);

    let config:Config = {} 

    if( await fs_exists( configPath ) ) {

        const cfg = require( configPath ) 

        if( cfg['serverId'] !== undefined ) { // Legacy format
            config[serverId!] = cfg
        }
        else {
            config = cfg
        }

        if( serverId ) {
            let defaultCredentials = new Preferences( serverId, CREDENTIALS_EMPTY ) 
                const configItem = config[serverId] 
            if( configItem ) {
                printConfigItem( [ configItem, defaultCredentials ] )
            }   
            else {
                throw new Error( `serverId ${serverId} in config file '${CONFIG_FILE} not found!`)
            }  
        }
        else {
            Object.values(config).forEach( ( configItem ) => {
                let defaultCredentials = new Preferences( configItem.serverId, CREDENTIALS_EMPTY )
                printConfigItem( [ configItem, defaultCredentials ] )
            })
            
        }
    }
    else {
        throw new Error( `config file '${CONFIG_FILE} doesn't exists!`)
    }
}


/**
 *
 */
export async function createOrUpdateConfig( params:{ serverId?:string, force?:boolean } ):Promise<ConfigItemAndCredentials> {

    const configPath = path.join(process.cwd(), CONFIG_FILE);
    const configFileExists = await fs_exists( configPath )

    let { serverId, force = false} = params
    let config:Config = {} 

    // Backward compatibility
    if( configFileExists ) {
        const cfg = require( configPath ) 

        if( cfg['serverId'] !== undefined ) { // Legacy format
            config[cfg['serverId']] = cfg
        }
        else {
            config = cfg
        }
    }

    if( !serverId ) {

        if( !configFileExists ) {
            throw new Error( `config file '${CONFIG_FILE} doesn't exists!`)
        }

        const serverIds = Object.keys(config)

        if( serverIds.length === 0 ) {
            throw new Error( `config file '${CONFIG_FILE} doesn't contain serverid! Add one using 'init' command`)
        }

        if( serverIds.length === 1 ) {
            serverId = serverIds[0]
        }
        else {
            const answer = await inquirer.prompt<{ serverId:string }>([
                {
                    type: 'list',
                    name: 'serverId',
                    message: 'select server id',
                    choices: serverIds 
                },
       
            ])
    
            serverId = answer.serverId 
    
        }
    }

    if( serverId === 'serverId' ) {
        throw new Error( `'serverId' value is not valid for set 'serverId' property!`)
    }

    let defaultCredentials = new Preferences( serverId, CREDENTIALS_EMPTY) 

    if( configFileExists ) {

        const configItem = config[serverId] 
        if( configItem && !force) {
            return [ configItem, defaultCredentials ]
        } 
    }

    const defaultConfig:ConfigItem = config[serverId] ?? {
        host:'localhost',
        path:'',
        port:80,
        protocol:'http',
        spaceId:'',
        parentPageTitle:'Home',
        sitePath:SITE_PATH,
        serverId:serverId
    }

    console.log( chalk.green('>'), chalk.bold('serverId:'), chalk.cyan(serverId) );

    const answers = await inquirer.prompt( [
            {
                type: 'input',
                name: 'sitePath',
                message: 'site relative path',
                default: defaultConfig.sitePath,
                validate: async ( value ) => {
                    const valid = await fs_exists( path.join( process.cwd(), value ));
                    return (valid) ? true : `file doesn't exist!`;
                }
            },
            {
                type: 'input',
                name: 'url',
                message: 'confluence url:',
                default: ConfigUtils.Url.format( defaultConfig ),
                validate: ( value ) => {
                    try {
                        new URL(value);
                        return true;
                      } catch (err) {
                        return 'url is not valid!';
                      }
                    }
            },
            {
                type: 'list',
                name: 'suffix',
                message: 'Which protocol want to use?',
                default: () => 
                    ( defaultConfig.path.match(restMatcher) ) ? PathSuffix.REST : PathSuffix.XMLRPC
                ,
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


    const { pathname = '', hostname, protocol, port } = new URL( answers['url'] )
    // const p = url.parse(answers['url']);
    
    const _path = normalizePath(removeSuffixFromPath(pathname) + (answers.suffix || '')) as string ;

    const configItem:ConfigItem = {
        path:_path,
        protocol:protocol as string,
        host:hostname as string,
        port:ConfigUtils.Port.value(port, (protocol==='https:' ? 443 : 80) ),
        spaceId:answers['spaceId'],
        parentPageTitle:answers['parentPageTitle'],
        sitePath:answers.sitePath,
        serverId:serverId
    }

    const c = new Preferences(serverId, defaultCredentials );
    c.username = answers['username']
    c.password = answers['password'];

    config[serverId] = configItem

    await fs_writeFile( configPath, JSON.stringify(config) )

    return [ configItem, c ] 
}
