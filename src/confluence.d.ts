/// <reference types="node" />
/// <reference path="confluence-model.d.ts" />

import {UrlObject} from 'url';
import { Stream } from 'stream';

declare const enum PathSuffix {
  XMLRPC = '/rpc/xmlrpc',
  REST = '/rest/api'
}
declare const enum Representation {
  STORAGE="storage" , WIKI="wiki"
}


interface BaseConfig {
  protocol:string, // ServiceProtocol
  host:string,
  port:number,
  path:string,

}

interface Config extends BaseConfig {
  spaceId:string,
  parentPageTitle:string,
  sitePath:string,
  serverId?:string
}

interface ContentStorage {
  representation:Representation;
  value:string;
}

/*
declare var ContentStorage: {
    prototype: ContentStorage;
    new( value:string, rapresentation:Representation ): ContentStorage;
}
*/

interface Credentials {
  username:string;
  password:string;
}


interface ConfluenceService {

    readonly credentials:Credentials;

    getPage( spaceKey:string, pageTitle:string ):Promise<Model.Page>;

    getPageByTitle( parentPageId:string, title:string):Promise<Model.PageSummary>;

    getPageById( pageId:string ):Promise<Model.Page>;

    getDescendents(pageId:string):Promise<Array<Model.PageSummary>>;

    getAttachment?( pageId:string, name:string, version:string ):Promise<Model.Attachment>;

    removePage( parentPage:Model.Page , title:string  ):Promise<boolean>;

    removePageById( pageId:string  ):Promise<boolean>;

    addLabelsByName( page:Model.Page, ...label:string[] ):Promise<boolean>;

    addAttachment( page:Model.Page, attachment:Model.Attachment, content:Buffer|(()=>Stream) ):Promise<Model.Attachment>;

    storePageContent( page:Model.Page, content:ContentStorage  ):Promise<Model.Page>;

    addPage( page:Model.Page ):Promise<Model.Page>;

    close():Promise<boolean>;
}
