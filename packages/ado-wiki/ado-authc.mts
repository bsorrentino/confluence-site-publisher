import 'zx/globals'

import * as vm from "azure-devops-node-api";
import * as CoreApi from "azure-devops-node-api/CoreApi"
import * as WikiApi from "azure-devops-node-api/WikiApi";
import * as WikiInterfaces from "azure-devops-node-api/interfaces/WikiInterfaces";
import { createOrUpdatePage } from './pages.mjs' 

export async function getWebApi(serverUrl?: string): Promise<vm.WebApi> {
    serverUrl = serverUrl || process.env.API_URL

    if( !serverUrl ) throw `API_URL not defined!`

    return await getApi(serverUrl);
}

export async function getApi(serverUrl: string): Promise<vm.WebApi> {
    const token = process.env.AZURE_PERSONAL_ACCESS_TOKEN!
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

export function getProject(): string {
    const { API_PROJECT } = process.env

    if( !API_PROJECT ) throw `API_PROJECT not defined!`

    return API_PROJECT
}



// your collection url
const serverUrl = "https://dev.azure.com/bartolomeosorrentino";

export async function run() { 
    const webApi = await getWebApi(serverUrl);
    const wikiApiObject: WikiApi.IWikiApi = await webApi.getWikiApi();
    const coreApiObject: CoreApi.ICoreApi = await webApi.getCoreApi();

    // console.log( coreApiObject, wikiApiObject )

    const project = getProject();
    console.log("Project:", project);

    const projectObject = await coreApiObject.getProject(project);
    
    const wikis = await wikiApiObject.getAllWikis(project);
    console.log("Wikis", wikis.map((wiki) => wiki.name));

    let wikiId =  wikis[0].id;

    // const createNewWiki = (wikis.length === 0);
    // if (createNewWiki) {
    //     const wikiParams = { name: "Hello Wiki", projectId: projectObject.id };
    //     const newWiki = await wikiApiObject.createWiki(wikiParams, project);
    //     console.log("Wiki created:", newWiki.name);
    //     wikiId = newWiki.id;
    // } else {
    //     wikiId = wikis[0].id;
    // }

    if( !wikiId ) throw `wikiId not found!`
    
    // const pageText: NodeJS.ReadableStream = await wikiApiObject.getPageText(project, wikiId)
    // console.log("Wiki text", pageText.read().toString());

    // if (createNewWiki) {
    //     const deletedWiki: WikiInterfaces.WikiV2 = await wikiApiObject.deleteWiki(wikiId, project);
    //     console.log("Wiki", deletedWiki.name, "deleted");
    // }

    const res = await createOrUpdatePage( 
        wikiApiObject,
        {
           project: project,
           wiki: wikiId,
           path: '/My Page 3',
           content: '# MY FIRST PAGE 3.3'
        }     
    )
    console.log( res )

}




run().catch( e => console.error( e ) )