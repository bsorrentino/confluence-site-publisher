
import * as util from 'util';
import * as url from 'url';

import request = require('request');

import { normalizePath } from './config';
import { Config, BaseConfig, Credentials } from './confluence';


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

class ConfluenceREST {

  baseUrl:string;

  constructor( config:BaseConfig, private credentials:Credentials ) {

    const cfg:url.UrlObject = {
      protocol: config.protocol,
      hostname: config.host,
      port: config.port,
      pathname: config.path
    }
    this.baseUrl = url.format( normalizePath(config) );

  }

  childrenPages( id:string ) {

    let serviceUrl =  util.format( '%s/content/%s/child/page?expand=', this.baseUrl, id, EXPAND );

    return new Promise( ( resolve, reject ) => {
      request.get( 
        serviceUrl, 
        {
        auth: {
          username: this.credentials.username,
          password: this.credentials.password,
          sendImmediately: false
        }
      },
      ( err, res, body ) => {
        if( err ) {
          return reject( err );
        }

        resolve( { res:res, body:body } );
      });
    });
  
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
    return this.call("getPage", [this.token,spaceKey,pageTitle] );
  }

  getPageById( id:string ):Promise<Page> {
    return this.call("getPage", [this.token,id] );
  }

  getChildren(pageId:string):Promise<Array<PageSummary>> {
    return this.call("getChildren", [this.token,pageId]);
  }

  getDescendents(pageId:string):Promise<Array<PageSummary>> {
    return this.call("getDescendents", [this.token,pageId] );
  }

  storePage(page:Page):Promise<Page>  {
    return this.call2("confluence1.", "storePage", [this.token,page] );
  }

  removePage(pageId:string):Promise<boolean> {
    return this.call("removePage", [this.token,pageId]);
  }

  addAttachment(parentId:string, attachment:Attachment, data:Buffer):Promise<Attachment>   {
    return this.call("addAttachment", [this.token,parentId, attachment, data]);
  }

  /**
   * Adds a label to the object with the given ContentEntityObject ID.
   */
  addLabelByName(page:Model.Page, labelName:string):Promise<boolean> {
      return this.call("addLabelByName", [this.token,labelName,page.id]);
  }

 
  private call<T>( op:string, args:Array<any> ):Promise<T> {
    return this.call2( this.servicePrefix, op, args );
  }

  private call2<T>( servicePrefix:string, op:string, args:Array<any> ):Promise<T> {
    let operation = servicePrefix.concat( op );

    return new Promise<T>( (resolve, reject) => {

      this.client.methodCall(operation, args, (error:any, value:any) => {
        if (error) {
            console.log('error:', error);
            console.log('req headers:', error.req && error.req._header);
            console.log('res code:', error.res && error.res.statusCode);
            console.log('res body:', error.body);
            reject(error);
          } else {
            //console.log('value:', value);
            resolve( value );
          }
        });
    });

  }

}

export class RESTConfluenceService/*Impl*/ implements ConfluenceService {

  static  create( config:BaseConfig, credentials:Credentials /*, ConfluenceProxy proxyInfo, SSLCertificateInfo sslInfo*/ ):Promise<XMLRPCConfluenceService> {
      if( config == null ) throw "config argument is null!";
      if( credentials == null ) throw "credentials argument is null!";
      
      /*
      if( sslInfo == null ) throw new IllegalArgumentException("sslInfo argument is null!");

      if (!sslInfo.isIgnore() && url.startsWith("https")) {
          HttpsURLConnection.setDefaultSSLSocketFactory( sslInfo.getSSLSocketFactory());
          HttpsURLConnection.setDefaultHostnameVerifier( sslInfo.getHostnameVerifier() );
      }
      */

      return new Promise<XMLRPCConfluenceService>( (resolve, reject) => {

        let confluence = new Confluence(config);
        confluence.login( credentials.username, credentials.password ).then( (token:string) => {

            return confluence.getServerInfo();

        }).then( (value:ServerInfo) => {

            if( value.majorVersion >= 4 ) {
              confluence.servicePrefix = "confluence2.";
            }
            resolve( new XMLRPCConfluenceService(confluence,credentials) );

        }).catch( (error) => {
          reject(error);
        });

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
  let c = new ConfluenceREST( {
    protocol:'http',
    host:'localhost',
    port:8090,
    path:'rest/api'
  }, {
    username:'admin',
    password:'admin'
  } );

  c.childrenPages( '123456').then( (res) => {
    console.log( res )
  }).catch( err => console.error(err) )
}
main();