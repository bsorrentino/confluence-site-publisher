import 'zx/globals'

import * as vm from "azure-devops-node-api";
import { VersionControlRecursionType } from 'azure-devops-node-api/interfaces/TfvcInterfaces.js';
import { getAllWikis } from './wiki.mjs';

export async function getWebApi(serverUrl?: string): Promise<vm.WebApi> {
    serverUrl = serverUrl || process.env.API_URL

    if( !serverUrl ) throw `API_URL not defined!`

    return await getApi(serverUrl);
}

export async function getApi(serverUrl: string): Promise<vm.WebApi> {
    const token = process.env.AZURE_PERSONAL_ACCESS_TOKEN

    // GUARDS
    if( !token ) throw `AZURE_PERSONAL_ACCESS_TOKEN not defined!`
    if( token.trim().length===0 ) throw `AZURE_PERSONAL_ACCESS_TOKEN ise empty!`

    const authHandler = vm.getPersonalAccessTokenHandler(token);
    const option = undefined;

    // The following sample is for testing proxy
    // option = {
    //     proxy: {
    //         proxyUrl: "http://127.0.0.1:8888"
    //         // proxyUsername: "1",
    //         // proxyPassword: "1",
    //         // proxyBypassHosts: [
    //         //     "github\.com"
    //         // ],
    //     },
    //     ignoreSslError: true
    // };

    // The following sample is for testing cert
    // option = {
    //     cert: {
    //         caFile: "E:\\certutil\\doctest\\ca2.pem",
    //         certFile: "E:\\certutil\\doctest\\client-cert2.pem",
    //         keyFile: "E:\\certutil\\doctest\\client-cert-key2.pem",
    //         passphrase: "test123",
    //     },
    // };

    const vsts = new vm.WebApi(serverUrl, authHandler, option);
    
    let connData = await vsts.connect();
    
    console.log(`Hello ${connData.authenticatedUser?.providerDisplayName}`);

    return vsts
}


// your collection url
const serverUrl = "https://dev.azure.com/bartolomeosorrentino";

export async function run() { 

    const wikis = await getAllWikis( 'bartolomeosorrentino', 'powerplatform' )

    if( !wikis || wikis.length === 0 ) throw `wiki projects not found!`

    const wiki = wikis[0]

    const { page, eTag } = await wiki.getPageById( 17, VersionControlRecursionType.None, true )

    console.log( eTag, page )

    if( page && eTag ) {

        const res = await wiki.createOrUpdatePage({
            path: page.path!,
            content: page.content! + Date(),
            etag: eTag[0]
        })
        console.log( res )
    }

}

run().catch( e => console.error( e ) )