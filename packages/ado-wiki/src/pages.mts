import * as WikiApi from "azure-devops-node-api/WikiApi";
import * as vm from "azure-devops-node-api";
import { TeamProject } from "azure-devops-node-api/interfaces/CoreInterfaces";
import { WikiPage, WikiPageCreateOrUpdateParameters, WikiPageResponse, WikiV2, TypeInfo } from "azure-devops-node-api/interfaces/WikiInterfaces";
import { VersionControlRecursionType } from "azure-devops-node-api/interfaces/TfvcInterfaces";

/**
 * CreateOrUpdatePage query parameters
 */
interface CreateOrUpdateQueryValues {
    path?: string // Wiki page path.
    comment?: string, // Comment to be associated with the page operation.
    'versionDescriptor.version'?: string // Version string identifier (name of tag/branch, SHA1 of commit)
    'versionDescriptor.versionOptions'?: string // Version options - Specify additional modifiers to version (e.g Previous)
    'versionDescriptor.versionType'?: string // Version type (branch, tag, or commit). Determines how Id is interpreted
}

export interface CreateOrUpdatePageResponse {
    path: string,
    order: number,
    gitItemPath: string,
    subPages: Array<string>,
    url: string,
    remoteUrl: string,
    id: number,
    content: string
}

const api_version = '7.1-preview.1'
const api_category = 'wiki'
const pages_replace_service_id = '25d3fbc7-fe3d-46cb-b5a5-0b6f79caf27b'
const pages_get_service_id = 'ceddcf75-1068-452d-8b13-2d4d76e1f970'

/**
 * [Pages description]
 */
export class WikiPages {

    constructor(
        private wikiApiObject: WikiApi.IWikiApi,
        private projectObject: TeamProject,
        private wiki: WikiV2) { }

    async getPageById(page_id: number, recursionLevel?: VersionControlRecursionType, includeContent?: boolean): Promise<WikiPageResponse> {

        if (!this.projectObject.id) throw `project id not defined!`
        if (!this.wiki.id) throw `wiki id not defined!`

        const { vsoClient, createAcceptHeader, http, formatResponse, rest } = this.wikiApiObject

        const routeValues = {
            project: this.projectObject.id,
            wikiIdentifier: this.wiki.id,
            id: page_id
        }

        const queryValues = {
            recursionLevel: recursionLevel,
            includeContent: includeContent,
        }

        const verData = await vsoClient.getVersioningData(
            api_version,
            api_category,
            pages_get_service_id,
            routeValues,
            queryValues)

        const { requestUrl: url, apiVersion } = verData

        if (!url) throw `url not defined!`
        if (!apiVersion) throw `apiVersion not defined!`

        const accept: string = createAcceptHeader("application/json", apiVersion)

        const res =  await http.get(url, { "Accept": accept })
        
        const body = await res.readBody()

        const eTag = res.message.headers['etag'] ?? ''
        
        const result:WikiPageResponse = {
            eTag:  [ eTag ],
            page: JSON.parse( body )
        }

       return result
    
    }
    

    /**
     * 
     * @param wikiApiObject {object} wiki api cleint
     * @param params {CreateOrUpdatePageRequest} parameters
     * 
     * @see https://learn.microsoft.com/en-us/rest/api/azure/devops/wiki/pages/create-or-update?view=azure-devops-rest-7.0
     */
    async createPage(params: { path: string, comment?: string, content?: string } ) {
        if (!this.projectObject.id) throw `project id not defined!`
        if (!this.wiki.id) throw `wiki id not defined!`

        const { path, comment, content } = params

        const { vsoClient, rest } = this.wikiApiObject

        const routeValues = {
            project: this.projectObject.id,
            wikiIdentifier: this.wiki.id
        }

        const queryValues: CreateOrUpdateQueryValues = {
            path: path,
            comment: comment
        }

        const verData = await vsoClient.getVersioningData(
            api_version,
            api_category,
            pages_replace_service_id,
            routeValues,
            queryValues);

        // console.log( 'verData', verData)

        const url = verData.requestUrl
        if (!url) throw 'error calculating target url'

        const options = this.wikiApiObject.createRequestOptions('application/json', verData.apiVersion);
        // console.log( 'options', options)

        const res = await rest.replace<WikiPage>(url, { content: content }, options);

        // const result = this.wikiApiObject.formatResponse( res.result, {}, false)
        return res

    }
}

/**
 * [WebApi description]
 *
 * @var {[type]}
 */
async function getApi(serverUrl: string): Promise<vm.WebApi> {
    const token = process.env.AZURE_PERSONAL_ACCESS_TOKEN

    // GUARDS
    if (!token) throw `AZURE_PERSONAL_ACCESS_TOKEN not defined!`
    if (token.trim().length === 0) throw `AZURE_PERSONAL_ACCESS_TOKEN ise empty!`

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

/**
 * [async description]
 *
 * @param   {string}             organization  [organization description]
 * @param   {string<WikiPages>}  project       [project description]
 *
 * @return  {Array<WikiPages>}                 [return description]
 */
export async function getPagesByWiki(organization: string, project: string,): Promise<Array<WikiPages>> {

    const serverUrl = `https://dev.azure.com/${organization}`

    const webApi = await getApi(serverUrl);
    const wikiApiObject = await webApi.getWikiApi();
    const coreApiObject = await webApi.getCoreApi();

    const projectObject = await coreApiObject.getProject(project);

    const wikis = await wikiApiObject.getAllWikis(project);

    return wikis.map(wid => (new WikiPages(wikiApiObject, projectObject, wid)))

}


