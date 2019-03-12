import * as filesystem from "fs";
import * as path from "path";
import { bindNodeCallback, Observable } from 'rxjs';
import { flatMap, map, take } from 'rxjs/operators';
import * as xml from "xml2js";
import { ElementAttributes, SiteProcessor } from "./confluence-site";



interface Element {
    $:ElementAttributes;
    attachment?:Array<Element>;
    child?:Array<Element>
    label?:Array<string>
}

const parser = new xml.Parser();

const rxParseString:( input:string )=>Observable<any> = bindNodeCallback( parser.parseString );

const rxReadFile = bindNodeCallback( filesystem.readFile );

export class XMLSiteProcessor extends SiteProcessor<Element> {

    /**
     * 
     */
    public rxParse( fileName:string ):Observable<Element> {
        return rxReadFile( path.join(this.sitePath, fileName) )
                .pipe( flatMap( (value:Buffer) => rxParseString( value.toString() ) ))
                .pipe( map( (value:any) => {
                    for( let first in value ) return value[first]['home'];
                }))
                .pipe( take(1) )
                ;
    }
    public attributes( element:Element ):ElementAttributes { return element.$; }
    protected attachments( element:Element ):Array<Element>|undefined { return element.attachment; }
    protected children( element:Element ):Array<Element>|undefined { return element.child; }
    protected labels( element:Element ):Array<string>|undefined { return element.label; }

}








