
import {create as XMLRPCConfluenceCreate } from "./confluence-xmlrpc";
import {create as RESTConfluenceCreate } from "./confluence-rest";
import {SiteProcessor} from "./confluence-site";
import { restMatcher, resetCredentials, createOrUpdateConfig, printConfig, version} from "./config";
import { ConfigItem, PathSuffix } from './confluence';

import * as URL from "url";
import * as path from "path";
import * as fs from "fs";
import * as util from "util"

import chalk = require("chalk")
import request = require("request")
import minimist = require('minimist')

import { Observable, Observer, of, from, bindNodeCallback, combineLatest } from 'rxjs';
import { map, tap, filter, reduce, mergeMap } from 'rxjs/operators';
import { Credentials, ConfluenceService } from "./confluence";
import { XMLSiteProcessor } from "./confluence-site-xml";
import { YAMLSiteProcessor } from "./confluence-site-yml";

interface Figlet {
  ( input:string, font:string|undefined, callback:(err:any, res:string) => void  ):void;

  fonts( callback:(err:any, res:Array<string>) => void ):void;
  metadata( type:string, callback:(err:any, options:any, headerComment:string) =>void ):void
}
const figlet:Figlet = require('figlet');

const LOGO      = 'Confluence Site';
const LOGO_FONT = 'Stick Letters';

let rxFiglet = bindNodeCallback( figlet );

let argv = process.argv.slice(2);

let args = minimist( argv, {} );


namespace commands {

//
// COMMAND
//
export function deploy() {

  //console.dir( args );

  rxFiglet( LOGO, undefined )
    .pipe( tap( (logo) => console.log( chalk.magenta( `${logo}\nversion: ${version()}\n`) ) ))
    .pipe( mergeMap( () => createOrUpdateConfig( { serverId: args['serverid'], force: args['config']  } )))
    .pipe( mergeMap( ([config,credentials]) => rxConfluenceConnection( config, credentials  ) ))
    .pipe( mergeMap( ([confluence,config]) => rxGenerateSite( config, confluence ) ))
    .subscribe({ 
      error: (err) => console.error( chalk.red(err) )
    })

}

/**
 * reset configuration
 */
export function reset() {
  rxFiglet( LOGO, undefined )
  .pipe( tap( (logo) => console.log( chalk.magenta( `${logo}\nversion: ${version()}\n`) ) ))
  .pipe( mergeMap( () => from(resetCredentials(args['serverid']))  ))
  .subscribe({ 
    error: (err)=> console.error( chalk.red(err) ) 
  })

}

export function init() {
    rxFiglet( LOGO, undefined )
    .pipe( tap( (logo) => console.log( chalk.magenta( `${logo}\nversion: ${version()}\n`) ) ))
    .pipe( mergeMap( () => createOrUpdateConfig( { serverId: args['serverid'], force: true  }  ) ))
    .subscribe({ 
      error: (err)=> console.error( chalk.red(err) ) 
    })

}

export function info() {
    rxFiglet( LOGO, undefined )
    .pipe( tap( (logo) => console.log( chalk.magenta( `${logo}\nversion: ${version()}\n`) ) ))
    .pipe( mergeMap( () => printConfig() ))
    .subscribe( {  
      error: (err) => console.error( chalk.red(err) )
    })
    
}

export function remove() {
    rxFiglet( LOGO, undefined )
    .pipe( tap( (logo) => console.log( chalk.magenta( `${logo}\nversion: ${version()}\n`) ) ))
    .pipe( mergeMap( () => createOrUpdateConfig( { serverId: args['serverid'] } ) ))
    .pipe( mergeMap( (result) => rxConfluenceConnection( result[0], result[1]  ) ))
    .pipe( mergeMap( (result) => rxDelete( result[0], result[1] ) ))
    .subscribe({
      next: (value)=> { console.log( '# page(s) removed ', value )},
      error: (err)=> console.error( chalk.red(err) )
    }) 
}


export function download( pageId:string, fileName:string, isStorageFormat = true ) {

  function rxRequest( config:ConfigItem, credentials:Credentials ):Observable<string> {
    return Observable.create( (observer:Observer<string>) => {

      let pathname = isStorageFormat ?
      "/plugins/viewstorage/viewpagestorage.action" :
      "pages/viewpagesrc.action";

      let input = URL.format({ 
        protocol:config.protocol,
        host: config.host,
        port: String(config.port),
        auth: credentials.username + ":" + credentials.password,
        pathname: config.path + pathname,
        query:{ pageId:pageId}    
      });

      console.log(input);

      request( { 
        url:input
      } )
      .pipe( fs.createWriteStream(fileName) )
      .on("end", () => observer.complete() )
      .on("error", (err) => observer.error(err) );
    });
  }


  rxFiglet( LOGO, undefined )
  .pipe( tap( (logo) => console.log( chalk.magenta( `${logo}\nversion: ${version()}\n`) ) ))
  .pipe( mergeMap( () => createOrUpdateConfig( { serverId: args['serverid'] }  ) ))
  .pipe(  mergeMap( ([config,credentials]) => rxRequest( config, credentials) ))
  .subscribe({
      next: (res) => console.log(res),
      error: err => console.error( chalk.red(err) )
  })

  }
} // end namespace command


clrscr();

//console.dir( args );

let command = (args._.length===0) ? "help" : args._[0];

switch( command ) {
  case "deploy":
    commands.deploy();
  break;
  case "init":
    commands.init();
  break;
  case "delete":
    commands.remove();
  break;
  case "info":
    commands.info();
  break;
  case "download":
  {
    let pageid = args['pageid'];
    commands.download( pageid, args["file"] || pageid, args["wiki"] || true );
  }
  break;
  default:
    usage();
}

/**
 * CLEAR SCREEN
 */
function clrscr() {
  //process.stdout.write('\033c');
  process.stdout.write('\x1Bc');

}

/**
 * 
 */
function usageCommand( cmd:string, desc:string, ...args: string[]) {
  desc = chalk.italic.gray(desc);
  return args.reduce( (previousValue, currentValue)=> {
    return util.format( "%s %s", previousValue, chalk.yellow(currentValue) );
  }, '\n' + cmd ) + desc;
}

/**
 * 
 */
function usage() {

  rxFiglet( LOGO, LOGO_FONT )
  .pipe( tap( { complete: () => process.exit(-1) } ))
  .subscribe( (logo) => {

    console.log( chalk.magenta( `${logo}\nversion: ${version()}\n`),
`
${chalk.cyan.underline('Usage:')}

confluence-site 
${usageCommand( 'init', '\t// create/update configuration', '--serverid <serverid>' )}
${usageCommand( 'deploy', '\t\t// deploy site to confluence', '[--config]' )}
${usageCommand( 'delete', '\t\t\t\t// delete site' )}
${usageCommand( 'download', ' // download page content', '--pageid <pageid>', '[--file]', '[--wiki]' )}
${usageCommand( 'info', '\t\t\t\t// show configuration' )}

${chalk.cyan('Options:')}
 --serverid\t${chalk.italic.gray('// it is the credentials\' profile.')}
 --config\t${chalk.italic.gray('// force reconfiguration.')}
 --pageid\t${chalk.italic.gray('// the page identifier.')}
 --file \t${chalk.italic.gray('// the output file name.')}
 --wiki \t${chalk.italic.gray('// indicate deprecated wiki content format ')}
`);

  });
}

/**
 * 
 */
function newSiteProcessor( confluence:ConfluenceService, config:ConfigItem ):SiteProcessor<any> {

    const ext = path.extname( path.basename( config.sitePath ) );

    const siteHome = ( path.isAbsolute(config.sitePath) ) ?
                        path.dirname(config.sitePath) :
                        path.join( process.cwd(), path.dirname(config.sitePath ));

    const suffix = config.path.match(restMatcher) ? PathSuffix.REST : PathSuffix.XMLRPC;

    const site = ( ext.match(/xml/i) ) ? 
      
        new XMLSiteProcessor( confluence,
                              config.spaceId,
                              config.parentPageTitle,
                              siteHome,
                              suffix
                            )
        :
        
        new YAMLSiteProcessor(  confluence,
                                config.spaceId,
                                config.parentPageTitle,
                                siteHome,
                                suffix
                              );
    return site;
                  
}

/**
 * 
 */
function rxConfluenceConnection(
                config:ConfigItem,
                credentials:Credentials ):Observable<[ConfluenceService,ConfigItem]>
{

      let rxConnection:Promise<ConfluenceService>;

      const restMatcher = new RegExp( `(${PathSuffix.REST})$` );

      if( config.path.match( restMatcher )) {

        rxConnection = RESTConfluenceCreate( config, credentials );
        
      }
      else { 

        const xmlrpcMatcher = new RegExp( `(${PathSuffix.XMLRPC})$` );

        if( !config.path.match( xmlrpcMatcher )) {
          
          config.path += PathSuffix.XMLRPC;
  
        }

        rxConnection = XMLRPCConfluenceCreate( config, credentials );

      }
      
      return combineLatest( rxConnection, of( config ), 
                (conn, conf) => { return [conn, conf] as [ConfluenceService,ConfigItem]; } );

}

/**
 * 
 */
function rxDelete( confluence:ConfluenceService, config:ConfigItem  ):Observable<number> {
    //let recursive = args['recursive'] || false;

    let siteFile = path.basename( config.sitePath );

    let site = newSiteProcessor( confluence, config );
    
    let rxParentPage = from( confluence.getPage( config.spaceId, config.parentPageTitle) );
    let rxParseSite = site.rxParse( siteFile );

    return combineLatest( [rxParentPage, rxParseSite] )
            .pipe( mergeMap( (result) => {
                
                const [parent,page] = result;
                const attrs = site.attributes( page );

                let getHome = from( confluence.getPageByTitle( parent.id as string, attrs.name as string) );

                return getHome
                        .pipe( filter( (home) => home!=null ) )
                        .pipe( mergeMap( (home) => 
                              from(confluence.getDescendents( home.id as string))
                                        .pipe( mergeMap( summaries => from(summaries) ))
                                        .pipe( mergeMap( (page:Model.PageSummary) => 
                                                from(confluence.removePageById( page.id as string))
                                                .pipe( tap( r => console.log( "page:", page.title, "removed!", r )) )
                                                .pipe( map( () => 1))
                                                ))
                                        .pipe( reduce( ( acc ) => ++acc, 0 ))
                                        .pipe( mergeMap( n => 
                                              from(confluence.removePageById(home.id as string) )
                                                              .pipe( tap( (r) => console.log( "page:", home.title, "removed!", r )))
                                                              .pipe( map( () => ++n ) )
                                        ))
                          ))
                        ;
                        
              }) )                       
}

/**
 * 
 */
function rxGenerateSite( config:ConfigItem, confluence:ConfluenceService ):Observable<any> {

    const siteFile = path.basename( config.sitePath );

    const site = newSiteProcessor( confluence, config );

    return site.rxStart( siteFile )
    ;

}
