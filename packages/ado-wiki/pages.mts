import * as WikiApi from "azure-devops-node-api/WikiApi";

const api_version = '7.1-preview.1'
const api_category = 'wiki'
const pages_service_id = '25d3fbc7-fe3d-46cb-b5a5-0b6f79caf27b'

/**
 * CreateOrUpdatePage query parameters
 */
interface _CreateOrUpdatePageParam {
    path?: string // Wiki page path.
    comment?: string, // Comment to be associated with the page operation.
    'versionDescriptor.version'?: string // Version string identifier (name of tag/branch, SHA1 of commit)
    'versionDescriptor.versionOptions'?: string // Version options - Specify additional modifiers to version (e.g Previous)
    'versionDescriptor.versionType'?: string // Version type (branch, tag, or commit). Determines how Id is interpreted
}

export interface CreateOrUpdatePageRequest {
    wiki: string,
    project: string,
    path: string,
    comment?: string
    content: string
}

export interface CreateOrUpdatePageResponse
{
    path: string,
    order: number,
    gitItemPath: string,
    subPages: Array<string>,
    url: string,
    remoteUrl: string,
    id: number,
    content: string
  }
/**
 * 
 * @param wikiApiObject {object} wiki api cleint
 * @param params {CreateOrUpdatePageRequest} parameters
 * 
 * @see https://learn.microsoft.com/en-us/rest/api/azure/devops/wiki/pages/create-or-update?view=azure-devops-rest-7.0
 */
export async function createOrUpdatePage( wikiApiObject: WikiApi.IWikiApi, params: CreateOrUpdatePageRequest ) {
    
    const { project, wiki, path, comment, content } = params

    const routeValues = {
        project: project,
        wikiIdentifier: wiki
    }

    const queryValues:_CreateOrUpdatePageParam = {
        path: path,
        comment: comment
    }

    const verData = await wikiApiObject.vsoClient.getVersioningData(
        api_version,
        api_category,
        pages_service_id,
        routeValues,
        queryValues);
    // console.log( 'verData', verData,)

    const url = verData.requestUrl
    if( !url ) throw 'error calculating target url'
    console.log( 'url', url )

    const options = wikiApiObject.createRequestOptions('application/json', verData.apiVersion);
    // console.log( 'options', options )

    const res = await wikiApiObject.rest.replace<CreateOrUpdatePageResponse>(url, { content: content }, options);
    return wikiApiObject.formatResponse(res.result, {}, false) as CreateOrUpdatePageResponse
    
}