
import {
    Observable,
    bindNodeCallback,
    Subscriber,
    combineLatest,
    of,
    from,
} from 'rxjs';

import {
    flatMap,
    filter,
} from 'rxjs/operators';

interface Figlet {
    ( input:string, font:string, callback:(err:any, res:string) => void  ):void;

    fonts( callback:(err:any, res:Array<string>) => void ):void;
    metadata( type:string, callback:(err:any, options:any, headerComment:string) =>void ):void
}

const figlet:Figlet = require('figlet');

interface FigletMetadata {
    font:string
    options:any,
    headerComment:string;
}

let rxFonts = bindNodeCallback( figlet.fonts );

let rxFiglet =  bindNodeCallback( figlet );

function rxMetadata( font:string ):Observable<FigletMetadata> {
    return  Observable.create( (subscriber:Subscriber<FigletMetadata>) => {
        figlet.metadata('Standard', function(err, options, headerComment) {
            if (err) {
                subscriber.error(err);
                return;
            }

            subscriber.next( { font:font, options:options, headerComment:headerComment });
            subscriber.complete();
        });
    } );
} 

const VALUE = 'Confluence\n     CLI';

function rxShowFont(font:string ):Observable<any> {

    return rxMetadata( font )
        .pipe( flatMap( (metadata) => 
                combineLatest( of(metadata), 
                               rxFiglet( VALUE, metadata.font ), 
                                    ( m, d ) => {     
                                        return {meta:m, data:d} 
                                    }) ))
        ;       
}

function rxShowAllFonts():Observable<any> {
    return rxFonts()
        .pipe( flatMap( values => from(values) ) )
        .pipe( flatMap( rxShowFont ) );
}


function showAllFont() {
    rxShowAllFonts()
    .pipe( filter( (data) => data['meta']['options']['height'] < 8 ) )
    .subscribe( (data) => {
        console.log( 
            "\n===============================\n",
            "font:", data['meta']['font'], data['meta']['options'],
            "\n===============================\n"); 
        console.log(data['data']) 
    });
}

/**
 * CLEAR SCREEN
 */
function clrscr() {
  //process.stdout.write('\033c');
  process.stdout.write('\x1Bc');

}

clrscr();

of( "Larry 3D 2", "Stick Letters")
.pipe( flatMap( rxShowFont ) )
.subscribe( (data) => console.log(data['data']) );

