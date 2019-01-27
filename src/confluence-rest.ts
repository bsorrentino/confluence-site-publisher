
import * as util from 'util';
import * as url from 'url';

import request = require('request');

import { normalizePath } from './config';
import {  BaseConfig, Credentials, ConfluenceService, ContentStorage } from './confluence';


interface ServerInfo {
  patchLevel:boolean,
  baseUrl: string,
  minorVersion: number,
  buildId: number,
  majorVersion: number,
  developmentBuild: boolean
}

interface PageSummary extends Model.PageSummary {
    url?:string;
    version?:number;
    permissions?:string;
}

interface Page extends PageSummary, Model.Page {
    current?:boolean;
    content?:string;
    modifier?:string;
    homePage?:boolean;
    creator?:string;
    contentStatus?:string;
    modified?: Date;
    created?: Date;
}

interface Attachment extends Model.Attachment {
  creator?:string;
  fileSize?:number;
  url?:string;
}

const EXPAND = 'space,version,container';

class Confluence {

  baseUrl:string;

  auth:request.AuthOptions 

  constructor( config:BaseConfig, credentials:Credentials ) {

    const cfg:url.UrlObject = {
      protocol: config.protocol,
      hostname: config.host,
      port: config.port,
      pathname: config.path
    }
    this.baseUrl = url.format( normalizePath(cfg) );
    this.auth = {
      username: credentials.username,
      password: credentials.password,
      sendImmediately: true
    }

  }

  _GET( serviceUrl:string ):Promise<request.ResponseAsJSON> 
  {

    return new Promise( ( resolve, reject ) => {
      request.get( 
        serviceUrl, 
        {
          auth: this.auth, json:true 
        },
        ( err, res, body ) => {
          if( err ) return reject( err );

          if( res.statusCode != 200 ) { 
            let err:any = new Error( `statusCode:${res.statusCode} ${res.statusMessage}`);
            err.code = res.statusCode;
            err.body = body;
            return reject( err) ;
          }
           
          resolve( res.toJSON() );
        });
      });
  }

  private _findPages( spaceKey:string, title:string ):Promise<request.ResponseAsJSON> {
    return this._GET( `${this.baseUrl}/content?spaceKey=${spaceKey}&title=${title}&expand=${EXPAND}` );  
  }

  private _findPageById( id:string ):Promise<request.ResponseAsJSON> {
    return this._GET( `${this.baseUrl}/content/${id}?expand=${EXPAND}` );
  }

  private _childrenPages( id:string ):Promise<request.ResponseAsJSON> {
    return this._GET( `${this.baseUrl}/content/${id}/child/page?expand=${EXPAND}` );  
  }

  private _descendantPages( id:string ):Promise<request.ResponseAsJSON> {
    //return this._GET( `${this.baseUrl}/content/${id}/descendant/page?expand=${EXPAND}` );  
    return this._GET( `${this.baseUrl}/content/${id}/child/page?expand=${EXPAND}` );  
  }
  

  getServerInfo():Promise<ServerInfo>  {
    return Promise.resolve( {
      patchLevel:false,
      baseUrl: '',
      minorVersion: 0,
      buildId: 0,
      majorVersion: 0,
      developmentBuild: false
    });
  }

  getPage( spaceKey:string, pageTitle:string):Promise<Page> {

    return this._findPages( spaceKey, pageTitle ).then( res => {
      
      if( util.isUndefined(res.body.results) || !util.isArray(res.body.results) ) return Promise.reject( "invalid result");
      if( res.body.results.length==0 ) return Promise.reject( "result is empty");

      return Promise.resolve(res.body.results[0] as Page);

    });
  }

  getPageById( id:string ):Promise<Page> {

    return this._findPageById( id ).then( res => {
      
      if( util.isUndefined(res.body) ) return Promise.reject( "invalid result" );

      return Promise.resolve(res.body as Page);

    });
   }

  getChildren(pageId:string):Promise<Array<PageSummary>> {
    return this._childrenPages( pageId ).then( res => {
      
      if( util.isUndefined(res.body.results) || !util.isArray(res.body.results) ) return Promise.reject( "invalid result");
      if( res.body.results.length==0 ) return Promise.reject( "result is empty");

      return Promise.resolve(res.body.results as Array<PageSummary>);

    });
  }

  getDescendents(pageId:string):Promise<Array<PageSummary>> {
    return this._descendantPages( pageId ).then( res => {
      
      if( util.isUndefined(res.body.results) || !util.isArray(res.body.results) ) return Promise.reject( "invalid result");
      if( res.body.results.length==0 ) return Promise.reject( "result is empty");

      return Promise.resolve(res.body.results as Array<PageSummary>);

    });
  }

  storePage(page:Page):Promise<Page>  {
    return Promise.reject( 'not implemented yet!');
  }

  removePage(pageId:string):Promise<boolean> {
    return Promise.reject( 'not implemented yet!');
  }

  addAttachment(parentId:string, attachment:Attachment, data:Buffer):Promise<Attachment>   {
    return Promise.reject( 'not implemented yet!');
  }

  /**
   * Adds a label to the object with the given ContentEntityObject ID.
   */
  addLabelByName(page:Model.Page, labelName:string):Promise<boolean> {
    return Promise.reject( 'not implemented yet!');
  }

}

export class RESTConfluenceService/*Impl*/ implements ConfluenceService {

  static  create( config:BaseConfig, credentials:Credentials /*, ConfluenceProxy proxyInfo, SSLCertificateInfo sslInfo*/ ):Promise<RESTConfluenceService> {
      if( config == null ) throw "config argument is null!";
      if( credentials == null ) throw "credentials argument is null!";
      

      return new Promise<RESTConfluenceService>( (resolve, reject) => {

        let confluence = new Confluence(config,credentials);

        resolve( new RESTConfluenceService(confluence,credentials) );
      });

  }

  private constructor( public connection:Confluence, credentials:Credentials) {
  }

  get credentials():Credentials {
    return this.credentials;
  }

  getPage( spaceKey:string, pageTitle:string ):Promise<Model.Page>
  {
    return this.connection.getPage(spaceKey,pageTitle);
  }

  getPageByTitle( parentPageId:string, title:string):Promise<Model.PageSummary>
  {
    if( parentPageId == null ) throw "parentPageId argument is null!";
    if( title == null ) throw "title argument is null!";

    return this.connection.getChildren(parentPageId)
    .then( (children:Array<PageSummary>) => {

        for( let i = 0 ; i<children.length; ++i ) {
          if( title === children[i].title ) {
            return Promise.resolve( children[i] );
          }
        }

        return Promise.reject( util.format('page "%s" not found!', title )) ;
    });
  }

  getPageById( pageId:string ):Promise<Model.Page>
  {
    if( pageId == null ) throw "pageId argument is null!";
    return this.connection.getPageById( pageId );
  }

  getDescendents(pageId:string):Promise<Array<Model.PageSummary>>
  {
    return this.connection.getDescendents( pageId );
  }

  getAttachment?( pageId:string, name:string, version:string ):Promise<Model.Attachment>
  {
    return Promise.reject("getAttachment not implemented yet");
  }

  removePage( parentPage:Model.Page , title:string  ):Promise<boolean>
  {
    return Promise.reject("removePage not implemented yet");;
  }

  removePageById( pageId:string  ):Promise<boolean>
  {
    return this.connection.removePage( pageId );
  }

  addLabelByName( page:Model.Page, label:string  ):Promise<boolean>
  {
    return this.connection.addLabelByName(page,label);
  }

  addAttachment( page:Model.Page, attachment:Model.Attachment, content:Buffer ):Promise<Model.Attachment>
  {
    return this.connection.addAttachment( page.id as string, attachment, content) ;
  }

  storePageContent( page:Model.Page, content:ContentStorage  ):Promise<Model.Page>
  {
    if( content == null ) {
        throw "content argument is null!";
    }

    let p = page as Page;
    p.content = content.value;

    return this.connection.storePage(p);
  }

  storePage( page:Model.Page ):Promise<Model.Page>
  {
    let p = page as Page;

    return this.connection.storePage(p);
  }

  /*
  call( task:(ConfluenceService) => void ) {
    this.connection.login( this.credentials.username, this.credentials.password )
      .then( (token) => {
          console.log( "session started!");
          task( this );
          return this.connection.logout();
      })
      .then( () => console.log( "session ended!") );
  }
  */
}


function main() {
  let c = new Confluence( {
    protocol:'http',
    host:'192.168.0.11',
    port:8090,
    path:'rest/api'
  }, {
    username:'admin',
    password:'admin'
  } );

  c.getPage( 'TEST', 'Home' ).then( ( res:any ) => {
    
    type K1 = keyof Page;

    console.log(  
`
id:${res.id}
modified:${res.modified}
creator:${res.creator}
permission:${res.permissions}
space:${res.space.id}
parentId:${res.parentId}
title:${res.title}
url:${res.url}
version:${res.version.number}
content:${res.content}
`
);

    //return c.getPageById( res.id as string );
    return c.getChildren( res.id as string );
  })
  .then( res => {

    console.log( res )

    
  })
  .catch( err => console.error(err) )
}
main();