import traverse = require('traverse');
import { Observable, Observer } from 'rxjs';

 
function removeSingleArrays(obj:any, filter?:(key:string) => boolean ) {
  // Traverse all the elements of the object
  traverse(obj).forEach(function traversing(value) {
    // As the XML parser returns single fields as arrays.
    if (value instanceof Array && value.length === 1) {
      if( filter && !filter(<string>this.key) ) return;
        this.update(value[0]);
    }
  });
}

function rxTraverse( obj:Object ):Observable<Object> {

    return Observable.create( (observer:Observer<Object>) => {

      traverse(obj).forEach(function traversing(value) {

        observer.next( value );
        // As the XML parser returns single fields as arrays.
        /*
        if (value instanceof Array && value.length === 1) {
          if( filter && !filter(this.key) ) return;
            this.update(value[0]);
        }
        */
      });
      observer.complete();
    });

}
