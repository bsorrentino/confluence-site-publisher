import * as xml from "xml2js";
import * as filesystem from "fs";
import * as path from "path";
import * as fs from 'fs';
import YAML = require('yaml');

import { Observable, Observer, throwError, of, from, bindNodeCallback, empty, concat, defer } from 'rxjs';
import { flatMap, map, tap, concatMap, switchMap } from 'rxjs/operators';

import {markdown2wiki} from "./md";
import { ConfluenceService, ContentStorage, Representation, PathSuffix } from "./confluence";
import { Stream } from "stream";
import { SiteProcessor, ElementAttributes } from "./confluence-site";

interface Element extends ElementAttributes{
    attachments?:Array<Element>;
    children?:Array<Element>
    labels?:Array<string>
}

const rxReadFile = bindNodeCallback( filesystem.readFile );

/**
 * 
 */
export class YAMLSiteProcessor extends SiteProcessor<Element> {

    /**
     * 
     */
    public rxParse( fileName:string ):Observable<Element> {
        return rxReadFile( path.join(this.sitePath, fileName) )
                .pipe( map( (value:Buffer) => YAML.parse( value.toString(), { } ) ));
    }

    public attributes( element:Element ):ElementAttributes { return element; }
    protected attachments( element:Element ):Array<Element>|undefined { return element.attachments; }
    protected children( element:Element ):Array<Element>|undefined { return element.children; }
    protected labels( element:Element ):Array<string>|undefined { return element.labels; }


}








