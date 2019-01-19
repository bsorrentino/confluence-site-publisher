/// <reference path="preferences.d.ts" />

import {XMLRPCConfluenceService} from "./confluence-xmlrpc";
import {SiteProcessor, Element, ElementAttributes} from "./confluence-site";
import {rxConfig, ConfigAndCredentials} from "./config";

import * as URL from "url";
import * as path from "path";
import * as fs from "fs";
import * as util from "util";
import * as chalk from "chalk";

import request = require("request");

import minimist     = require("minimist");
import Preferences  = require("preferences");

import { Observable, Observer, throwError, of, from, bindNodeCallback, empty, concat,combineLatest } from 'rxjs';
import { flatMap, map, tap, concatMap, filter, reduce } from 'rxjs/operators';

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
    .pipe( tap( (logo) => console.log( chalk.magenta(logo as string) ) ))
    //.map( (logo) => args['config'] || false )
    //.doOnNext( (v) => console.log( "force config", v, args))
    .pipe( flatMap( (logo) => rxConfig(args['config'] || false ) ))
    .pipe( flatMap( ([config,credentials]) => rxConfluenceConnection( config, credentials  ) ))
    .pipe( flatMap( ([confluence,config]) => rxGenerateSite( config, confluence ) ))
    .subscribe(
      //(result) => console.dir( result, {depth:2} ),
      (result) => {},
      (err) => console.error( chalk.red(err) )
    );

}

export function init() {
    rxFiglet( LOGO, undefined )
    .pipe( tap( (logo) => console.log( chalk.magenta(logo as string) ) ))
    .pipe( flatMap( () => rxConfig( true, args['serverid']) ))
    .subscribe(
      (value)=> {},
      (err)=> console.error( chalk.red(err) )
    );

}

export function info() {
    rxFiglet( LOGO, undefined )
    .pipe( tap( (logo) => console.log( chalk.magenta(logo as string) ) ))
    .pipe( flatMap( () => rxConfig( false ) ))
    .subscribe(
      (value)=> {},
      (err)=> console.error( chalk.red(err) )
    );

}

export function remove() {
    rxFiglet( LOGO, undefined )
    .pipe( tap( (logo) => console.log( chalk.magenta(logo as string) ) ))
    .pipe( flatMap( v => rxConfig(false) ))
    .pipe( flatMap( (result) => rxConfluenceConnection( result[0], result[1]  ) ))
    .pipe( flatMap( (result) => rxDelete( result[0], result[1] ) ))
    .subscribe(
      (value)=> { console.log( "# page(s) removed ", value )},
      (err)=> console.error( chalk.red(err) )
    ); 
}


export function download( pageId:string, fileName:string, isStorageFormat = true ) {

  function rxRequest( config:Config, credentials:Credentials ):Observable<string> {
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
  .pipe( tap( (logo) => console.log( chalk.magenta(logo as string) ) ))
  .pipe( flatMap( () => rxConfig( false ) ))
  .pipe(  flatMap( ([config,credentials]) => rxRequest( config, credentials) ))
  .subscribe( 
    (res) => {
      console.log(res)
     } ,
    err => console.error( chalk.red(err) )
  );
/*
  .flatMap( ([config,credentials]) => rxConfluenceConnection( config, credentials ) )
  .flatMap( ([confluence,config]) => Rx.Observable.fromPromise( confluence.getPageById( pageId )) )
    .subscribe( 
      (res) => {
        console.log(res.title)
       } ,
      err => console.error( chalk.red(err) )
    );
 */
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
  return args.reduce( (previousValue, currentValue, currentIndex, array)=> {
    return util.format( "%s %s", previousValue, chalk.yellow(currentValue) );
  }, "\n\n" + cmd ) + desc;
}

/**
 * 
 */
function usage() {

  rxFiglet( LOGO, LOGO_FONT )
  .pipe( tap( undefined, undefined, () => process.exit(-1) ))
  .subscribe( (logo) => {

    console.log( chalk.bold.magenta(logo as string),
      "\n" +
      chalk.cyan( "Usage:") +
      " confluence-site " +
      usageCommand( "init", "\t// create/update configuration", "--serverid <serverid>" ) +
      usageCommand( "deploy", "\t\t// deploy site to confluence", "[--config]" ) +
      usageCommand( "delete", "\t\t\t\t// delete site" ) +
      usageCommand( "download", " // download page content", "--pageid <pageid>", "[--file]", "[--wiki]" ) +
      usageCommand( "info", "\t\t\t\t// show configuration" ) +
      "\n\n" +
      chalk.cyan("Options:") +
      "\n\n" +
      " --serverid \t" + chalk.italic.gray("// it is the credentials' profile.") +
      "\n" +
      " --config\t" + chalk.italic.gray("// force reconfiguration.") +
      "\n" +
      " --pageid \t" + chalk.italic.gray("// the page identifier.") +
      "\n" +
      " --file \t" + chalk.italic.gray("// the output file name.") +
      "\n" +
      " --wiki \t" + chalk.italic.gray("// indicate deprecated wiki content format ") +
      "\n"
    );

  });
}

/**
 * 
 */
function newSiteProcessor( confluence:XMLRPCConfluenceService, config:Config ):SiteProcessor {

    let siteHome = ( path.isAbsolute(config.sitePath) ) ?
                        path.dirname(config.sitePath) :
                        path.join( process.cwd(), path.dirname(config.sitePath ));

    let site = new SiteProcessor( confluence,
                              config.spaceId,
                              config.parentPageTitle,
                              siteHome
                            );
    return site;
                  
}

/**
 * 
 */
function rxConfluenceConnection(
                config:Config,
                credentials:Credentials ):Observable<[XMLRPCConfluenceService,Config]>
{

      let service = XMLRPCConfluenceService.create( config, credentials );

      let rxConnection = from( service );

      let rxCfg = of( config );

      return combineLatest( rxConnection, rxCfg, 
                (conn, conf) => { return [conn, conf] as [XMLRPCConfluenceService,Config]; } );

}

/**
 * 
 */
function rxDelete( confluence:XMLRPCConfluenceService, config:Config  ):Observable<number> {
    //let recursive = args['recursive'] || false;

    let siteFile = path.basename( config.sitePath );

    let site = newSiteProcessor( confluence, config );
    
    let rxParentPage = from( confluence.getPage( config.spaceId, config.parentPageTitle) );
    let rxParseSite = site.rxParse( siteFile );

    return combineLatest( rxParentPage, rxParseSite, 
            (parent,home) => [parent,home] as [Model.Page,Array<Object>])
              //.doOnNext( (result) => console.dir( result ) )
              .pipe( flatMap( (result) => {
                
                let [parent,pages] = result;
                let first = pages[0] as Element ;
                
                let getHome = from( confluence.getPageByTitle( parent.id as string, first.$.name as string) );

                return getHome
                        .pipe( filter( (home) => home!=null ) )
                        .pipe( flatMap( (home) => 
                              from(confluence.getDescendents( home.id as string))
                                        .pipe( flatMap( summaries => from(summaries) ))
                                        .pipe( flatMap( (page:Model.PageSummary) => 
                                                from(confluence.removePageById( page.id as string))
                                                .pipe( tap( r => console.log( "page:", page.title, "removed!", r )) )
                                                .pipe( map( r => 1))
                                                ))
                                        .pipe( reduce( ( acc, x ) => ++acc, 0 ))
                                        .pipe( flatMap( n => 
                                              from(confluence.removePageById(home.id as string) )
                                                              .pipe( tap( (r) => console.log( "page:", home.title, "removed!", r )))
                                                              .pipe( map( (value) => ++n ) )
                                        ))
                          ))
                        ;
                        
              }) )                       
}

/**
 * 
 */
function rxGenerateSite( config:Config, confluence:XMLRPCConfluenceService ):Observable<any> {

    let siteFile = path.basename( config.sitePath );

    let site = newSiteProcessor( confluence, config );

    return site.rxStart( siteFile )
      .pipe( tap( undefined, undefined, () => confluence.connection.logout().then( () => {
        //console.log("logged out!");
      })));

}

