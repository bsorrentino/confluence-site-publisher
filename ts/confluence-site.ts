import {XMLRPCConfluenceService} from "./confluence-xmlrpc";
import * as xml from "xml2js";
import * as filesystem from "fs";
import * as path from "path";

import { Observable, Observer, throwError, of, from, bindNodeCallback, empty, concat } from 'rxjs';
import { flatMap, map, tap, concatMap } from 'rxjs/operators';

import {markdown2wiki} from "./md";

export interface ElementAttributes {
    name?:string;
    uri?:string;
    [n: string]: any;
}

export interface Element {
    $:ElementAttributes;
    attachment?:Array<Element>;
    child?:Array<Element>
    label?:Array<string>
}

interface PageContext {
    meta:Element;
    parent?:Model.Page;
}

let parser = new xml.Parser();
let rxParseString:( input:string )=>Observable<any> = bindNodeCallback( parser.parseString );
export let rxReadFile = bindNodeCallback( filesystem.readFile );

export class SiteProcessor {
    /**
     * 
     */
    constructor( 
        public confluence:ConfluenceService,
        public spaceId:string,
        public parentTitle:string,
        public sitePath:string 
        ) {} 


    /**
     * 
     */
    rxParse( fileName:string ):Observable<Array<Object>> {
        return rxReadFile( path.join(this.sitePath, fileName) )
                .pipe( flatMap( (value:Buffer) => rxParseString( value.toString() ) ))
                //.doOnNext( (value) => console.dir( value, { depth:4 }) )
                .pipe( map( (value:any) => {
                    for( let first in value ) return value[first]['home'];
                }));
    }

    /**
     * 
     */
    rxStart( fileName:string ):Observable<any> {
        return this.rxParse( fileName )
                .pipe( flatMap( (value) => this.rxProcessChild(value) ) );
    }

    /**
     * 
     */
    rxReadContent( filePath:string ):Observable<ContentStorage> {
        
        return rxReadFile( filePath )
            .pipe( map( (value:Buffer) => {
                let storage:ContentStorage ;

                let ext = path.extname(filePath);
                
                switch( ext) {
                    case ".md":
                        storage = {
                            value:markdown2wiki(value), 
                            representation:Representation.WIKI
                        };
                    break;
                    default:
                        storage = {value:value.toString(), representation:Representation.WIKI};

                    break;               
                }

                return storage;
            }));
        
    }

    /**
     * 
     */
    rxCreateAttachment( ctx:PageContext ) {
        let confluence = this.confluence;

        let attachment:Model.Attachment =  {
                comment:ctx.meta.$['comment'] as string,
                contentType:ctx.meta.$['contentType'] as string,
                fileName:ctx.meta.$.name as string
            };
        return rxReadFile( path.join(this.sitePath, ctx.meta.$.uri as string) )
                .pipe( tap( undefined, undefined, () => console.log( "created attachment:", attachment.fileName )) )
                .pipe(flatMap( (buffer:Buffer) => 
                            from(confluence.addAttachment( ctx.parent as Model.Page, attachment, buffer ))));

    } 

    private getOrCreatePage( spaceKey:string , parentPageTitle:string , title:string  ):Promise<Model.Page>
    {
      return this.confluence.getPage(spaceKey, parentPageTitle)
      .then( (parentPage:Model.Page) => this.getOrCreatePageFromParent(parentPage, title) )
      ;
    }
  
    private getOrCreatePageFromParent( parentPage:Model.Page , title:string  ):Promise<Model.Page>
    {
      const p:Model.Page = {
        space:parentPage.space,
        parentId:parentPage.id,
        title:title
      };
  
    return this.confluence.getPageByTitle(parentPage.id as string, title)
      .then( (result:Model.PageSummary) => {
        if( result != null )
          return this.confluence.getPageById(result.id as string);
  
        return Promise.resolve(p);
      })
      .catch( (e) => {
        return this.confluence.storePage( p );
      })
      ;
  
    }
      /**
     * 
     */
    rxCreatePage( ctx:PageContext ) {
        let confluence = this.confluence;

        let getOrCreatePage = 
            ( !ctx.parent ) ? 
                    from(this.getOrCreatePage( this.spaceId, this.parentTitle, ctx.meta.$.name as string )) :
                    from(this.getOrCreatePageFromParent( ctx.parent, ctx.meta.$.name as string ))
                    ;
        return getOrCreatePage
                .pipe( tap( (page) => console.log( "creating page:", page.title )) )
                .pipe( flatMap( (page) => {
                    return this.rxReadContent( path.join(this.sitePath, ctx.meta.$.uri as string) )
                        .pipe(flatMap( (storage) => from(confluence.storePageContent( page, storage ))));
                }))                   
    }   

    private rxProcessLabels( ctx:PageContext ) {
        return from( ctx.meta.label || [])
                    .pipe( flatMap( (data:string) => 
                        from(this.confluence.addLabelByName( ctx.parent as Model.Page, data )) ) )
                    ;        
    } 

    private rxProcessAttachments( ctx:PageContext ) {
        return from( ctx.meta.attachment || [])
                    .pipe( map( (data:Element) => { return { meta:data, parent:ctx.parent }} ))
                    .pipe( flatMap( (ctx:PageContext) => this.rxCreateAttachment( ctx ) )) 
                    ;        
    } 

    rxProcessChild( child:Array<Object>, parent?:Model.Page ):Observable<any> {
        if( !child || child.length == 0 ) return empty();

        let first = child[0] as Element ;
        
        let childObservable = 
            this.rxCreatePage( {meta:first, parent:parent } )
                .pipe( flatMap( (page:Model.Page) => {

                    let o1 = this.rxProcessAttachments( {meta:first, parent:page} ); 
                    let o2 = this.rxProcessLabels( {meta:first, parent:page} ); 
                    let o3 = from( first.child || [] )
                            .pipe( map( (data:Element) => { return { meta:data, parent:page } }) )                           
                            .pipe( concatMap( (ctx:PageContext) => {
                    
                                return this.rxCreatePage( ctx )
                                        .pipe( flatMap( (child:Model.Page) => {
                                            let o1 = this.rxProcessAttachments( {meta:ctx.meta, parent:child} );    
                                            let o2 = this.rxProcessLabels( {meta:ctx.meta, parent:child} ); 
                                            let o3 = this.rxProcessChild(ctx.meta.child || [], child );
                                            return concat( o1, o2, o3 );
                                        }))
                            }));
                                
                                                
                    return concat( o1, o2, o3 );
                }));

                return childObservable;

    }
       
        
}








