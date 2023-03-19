import 'zx/globals'

import * as vm from "azure-devops-node-api";
import * as CoreApi from "azure-devops-node-api/CoreApi"
import * as WikiApi from "azure-devops-node-api/WikiApi";
import * as WikiInterfaces from "azure-devops-node-api/interfaces/WikiInterfaces";
import { VersionControlRecursionType } from 'azure-devops-node-api/interfaces/TfvcInterfaces.js';
import { getPagesByWiki } from './pages.mjs';

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

    const pages = await getPagesByWiki( 'bartolomeosorrentino', 'powerplatform' )

    if( !pages || pages.length === 0 ) throw `wiki projects not found!`

    // const createNewWiki = (wikis.length === 0);
    // if (createNewWiki) {
    //     const wikiParams = { name: "Hello Wiki", projectId: projectObject.id };
    //     const newWiki = await wikiApiObject.createWiki(wikiParams, project);
    //     console.log("Wiki created:", newWiki.name);
    //     wikiId = newWiki.id;
    // } else {
    //     wikiId = wikis[0].id;
    // }

    // const pageText: NodeJS.ReadableStream = await wikiApiObject.getPageText(project, wikiId)
    // console.log("Wiki text", pageText.read().toString());

    // if (createNewWiki) {
    //     const deletedWiki: WikiInterfaces.WikiV2 = await wikiApiObject.deleteWiki(wikiId, project);
    //     console.log("Wiki", deletedWiki.name, "deleted");
    // }

    // const page = await pages[0].getPageById( 9, VersionControlRecursionType.None, false )

    const res = await pages[0].createPage({
           path: '/My Page 7',
           content: '# MY FIRST PAGE'
    })
    console.log( Object.entries(res.headers).find( ([k,v])  => k === 'etag' ) )

}




run().catch( e => console.error( e ) )