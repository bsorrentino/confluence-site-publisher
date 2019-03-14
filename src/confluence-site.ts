import * as filesystem from "fs";
import * as fs from 'fs';
import * as path from "path";
import { bindNodeCallback, concat, defer, empty, from, Observable, of } from 'rxjs';
import { concatMap, flatMap, map, switchMap, tap } from 'rxjs/operators';
import { Stream } from "stream";
import { ConfluenceService, ContentStorage, PathSuffix, Representation } from "./confluence";
import { markdown2wiki } from "./md";


const rxReadFile = bindNodeCallback( filesystem.readFile );

export interface ElementAttributes {
    name:string;
    uri?:string;
    [n: string]: any;
}

interface PageContext<E> {
    meta:E;
    parent?:Model.Page;
}

export abstract class SiteProcessor<E> {
    /**
     * 
     */
    constructor( 
        public confluence:ConfluenceService,
        public spaceId:string,
        public parentTitle:string,
        public sitePath:string,
        private suffix:PathSuffix
        ) {} 

    public abstract attributes( element:E ):ElementAttributes;
    protected abstract attachments( element:E ):Array<E>|undefined;
    protected abstract children( element:E ):Array<E>|undefined;
    protected abstract labels( element:E ):Array<string>|undefined;

    /**
     * 
     */
    public abstract rxParse( fileName:string ):Observable<E>; 

    /**
     * 
     */
    public rxStart( fileName:string ):Observable<any> {
        return this.rxParse( fileName )
                .pipe( flatMap( (value) => this.rxProcessChildren( [value] ) ) );
    }

    /**
     * 
     */
    private rxReadContent( filePath:string ):Observable<ContentStorage> {
        
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
    private rxCreateAttachment( ctx:PageContext<E> ) {
        let confluence = this.confluence;

        const attrs = this.attributes( ctx.meta );

        let attachment:Model.Attachment =  {
                comment:attrs['comment'] as string,
                contentType:attrs['contentType'] as string,
                fileName:attrs.name as string
            };

        const parent = ctx.parent as Model.Page;

        let rxBufferOrStream:Observable<Buffer|Stream>;
        
        if( this.suffix == PathSuffix.REST ) {

            rxBufferOrStream = 
                from( confluence.getAttachment( parent.id as string, attachment.fileName, '1' ))
                .pipe( switchMap( att => {
                    if( att ) attachment.id = att.id;
                    return defer( () => 
                        of(fs.createReadStream( path.join(this.sitePath, (attrs.uri || attrs.name) ) )) );
                }));
        }
        else {
            rxBufferOrStream = rxReadFile( path.join(this.sitePath, (attrs.uri || attrs.name) ) );
        }

        return rxBufferOrStream
                    .pipe( tap( undefined, undefined, () => console.log( "creating attachment:", attachment.fileName )) )
                    .pipe(flatMap( buffer => 
                        from(confluence.addAttachment( parent, attachment, buffer ))));
    } 

    private async getOrCreatePage( spaceKey:string , parentPageTitle:string , title:string  ):Promise<Model.Page>
    {
      return this.confluence.getPage(spaceKey, parentPageTitle)
      .then( (parentPage:Model.Page) => this.getOrCreatePageFromParent(parentPage, title) )
      ;
    }
  
    private async getOrCreatePageFromParent( parentPage:Model.Page , title:string  ):Promise<Model.Page>
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
        return this.confluence.addPage( p );
      })
      ;
  
    }
      /**
     * 
     */
    private rxCreatePage( ctx:PageContext<E> ) {
        const confluence = this.confluence;

        const attrs = this.attributes( ctx.meta );

        let getOrCreatePage = 
            ( !ctx.parent ) ? 
                    from(this.getOrCreatePage( this.spaceId, this.parentTitle, attrs.name  )) :
                    from(this.getOrCreatePageFromParent( ctx.parent, attrs.name ))
                    ;
        return getOrCreatePage
                .pipe( tap( (page) => console.log( "creating page:", page.title )) )
                .pipe( flatMap( (page) => {
                    return this.rxReadContent( path.join(this.sitePath, (attrs.uri || attrs.name) ) )
                        .pipe(flatMap( (storage) => from(confluence.storePageContent( page, storage ))));
                }))                   
    }   

    private rxProcessLabels( ctx:PageContext<E> ) {
        return from( this.labels(ctx.meta) || [])
                    .pipe( flatMap( (data:string) => 
                        from(this.confluence.addLabelsByName( ctx.parent as Model.Page, data )) ) )
                    ;        
    } 

    private rxProcessAttachments( ctx:PageContext<E> ) {
        return from( this.attachments(ctx.meta) || [])
                    .pipe( map( (data:E) => { return { meta:data, parent:ctx.parent }} ))
                    .pipe( flatMap( (ctx:PageContext<E>) => this.rxCreateAttachment( ctx ) )) 
                    ;        
    } 

    private rxProcessChildren( children:Array<E>, parent?:Model.Page ):Observable<any> {
        if( !children || children.length == 0 ) return empty();

        let first = children[0] as E ;
        
        let childObservable = 
            this.rxCreatePage( {meta:first, parent:parent } )
                .pipe( flatMap( (page:Model.Page) => {

                    let o1 = this.rxProcessAttachments( {meta:first, parent:page} ); 
                    let o2 = this.rxProcessLabels( {meta:first, parent:page} ); 
                    let o3 = from( this.children(first) || [] )
                            .pipe( map( (data:E) => { return { meta:data, parent:page } }) )                           
                            .pipe( concatMap( (ctx:PageContext<E>) => {
                    
                                return this.rxCreatePage( ctx )
                                        .pipe( flatMap( (child:Model.Page) => {
                                            let o1 = this.rxProcessAttachments( {meta:ctx.meta, parent:child} );    
                                            let o2 = this.rxProcessLabels( {meta:ctx.meta, parent:child} ); 
                                            let o3 = this.rxProcessChildren(this.children(ctx.meta) || [], child );
                                            return concat( o1, o2, o3 );
                                        }))
                            }));
                                
                                                
                    return concat( o1, o2, o3 );
                }));

                return childObservable;

    }
       
        
}








