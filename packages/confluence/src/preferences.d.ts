
/*
declare namespace Preferences {

    export interface Data {
        account: { username:string, password:string }   
    }

}

declare module "preferences" {

    interface PreferencesStatic   {
        new<T extends Preferences.Data>( identifier:string, data: T ): T;
    }
    var Preferences:PreferencesStatic;
    export = Preferences;
}
*/

declare module "preferences" {

    type Data = { [key:string]:any }

    interface P {
        clear():void
    }
    interface PreferencesStatic   {
        new<T>( identifier:string, data: T ): T & P;
    }
    var Preferences:PreferencesStatic;
    export = Preferences;
}
