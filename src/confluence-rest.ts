
import { Readable, Stream } from 'stream';
import * as url from 'url';
import * as util from 'util';
import { normalizePath } from './config';
import * as querystring from 'querystring';

import { BaseConfig, ConfluenceService, ContentStorage, Credentials, Representation } from './confluence';

import request = require('request');

interface Ancestor {
  id: string;
}

interface Container {
  id?: string,
  name?: string,
  key: string;
}

interface Space extends Container {

}
interface Version {
  number: number;
  minorEdit?: boolean,
  when?: Date
}

interface PageBody {
  storage: {
    representation: Representation,
    value: any
  }
}

interface Page {
  id?: string;
  version: Version;
  type: string;
  title: string;
  space: Space;
  container?: Container;

}

interface CreatePageInput extends Page {
  ancestors: Array<Ancestor>;
}

interface UpdatePageInput extends Page {
  body?: PageBody;
}

interface PageLabel {
  prefix: 'global';
  name: string;
}

interface PageAttachment extends Page {
  extensions: {
    mediaType: string,
    fileSize: number,
    comment: string
  },

}

interface CreateAttachmentInput {
  id?: string,
  comment?: string;
  minorEdit?: boolean;
  filename: string;
  contentType: string;
  content: Stream,
}

const EXPAND = 'space,version,container';

/**
 * conver buffer to stream
 * 
 * @ref https://stackoverflow.com/a/44091532/521197
 * 
 * @param buffer 
 * 
 */
function buffer2Stream(buffer: Buffer): Stream {
  const readable = new Readable()
  readable._read = () => { } // _read is required but you can noop it
  readable.push(buffer)
  readable.push(null)

  return readable;
}

/**
 * 
 */
function attachment2Model<T extends Model.Attachment>(a: PageAttachment) {
  return {
    id: a.id,
    fileName: a.title,
    comment: a.extensions.comment,
    contentType: a.extensions.mediaType,
    created: a.version.when
  } as T;

}

/**
 * 
 * @param p 
 */
function page2Model<T extends Model.Page>(p: Page): T {
  return {
    id: p.id,
    title: p.title,
    version: p.version.number,
    space: p.space.key,
    parentId: (p.container || { id: null }).id
  } as T;
}

/**
 * 
 * @param p 
 */
function model2Page<T extends Model.Page, P extends Page>(p: T): P {
  return {
    id: p.id,
    title: p.title,
    version: { number: p.version },
    space: { key: p.space },
    type: 'page'
  } as P;
}

function getHttpErrorMessage(res: request.Response): string {

  if (res.statusMessage) return res.statusMessage;
  if (util.isString(res.body)) return res.body;
  if (util.isObject(res.body)) return `${res.body.reason} - ${res.body.message}`;

  return '';

}

function _POST_PUT(method: string, auth: request.AuthOptions, serviceUrl: string, inputBody: any): Promise<request.ResponseAsJSON> {

  return new Promise((resolve, reject) => {
    request(
      serviceUrl,
      {
        method: method,
        auth: auth, json: true,
        body: inputBody,
        headers: {
          'User-Agent': 'confluence-site-publisher',
          'X-Atlassian-Token': 'no-check'
        },
      },
      (err, res, body) => {
        if (err) return reject(err);

        if (res.statusCode != 200) {
          const msg = getHttpErrorMessage(res);

          let err: any = new Error(`${res.statusCode} - ${msg}`);
          err.code = res.statusCode;
          err.body = body;
          return reject(err);
        }

        resolve(res.toJSON());
      });
  });
}

function _GET_DELETE(method: string, auth: request.AuthOptions, serviceUrl: string): Promise<request.ResponseAsJSON> {

  return new Promise((resolve, reject) => {
    request(
      serviceUrl,
      {
        headers: {
          'User-Agent': 'confluence-site-publisher',
          'X-Atlassian-Token': 'no-check'
        },

        method: method,
        auth: auth, json: true
      },
      (err, res, body) => {
        if (err) return reject(err);

        if (res.statusCode >= 400) {
          const msg = getHttpErrorMessage(res);

          let err: any = new Error(`${res.statusCode} - ${msg}`);

          err.code = res.statusCode;
          err.body = body;
          return reject(err);
        }

        resolve(res.toJSON());
      });
  });
}

class Confluence {

  baseUrl: string;

  auth: request.AuthOptions

  constructor(config: BaseConfig, credentials: Credentials) {

    const cfg: url.UrlObject = {
      protocol: config.protocol,
      hostname: config.host,
      port: config.port,
      pathname: config.path
    }
    this.baseUrl = url.format(normalizePath(cfg));
    this.auth = {
      username: credentials.username,
      password: credentials.password,
      sendImmediately: true
    }

    this._POST = _POST_PUT.bind(null, "POST", this.auth);
    this._PUT = _POST_PUT.bind(null, "PUT", this.auth);
    this._GET = _GET_DELETE.bind(null, "GET", this.auth);
    this._DELETE = _GET_DELETE.bind(null, "DELETE", this.auth);

  }

  private _GET: ((url: string) => Promise<request.ResponseAsJSON>);
  private _DELETE: ((url: string) => Promise<request.ResponseAsJSON>);
  private _POST: ((url: string, body: any) => Promise<request.ResponseAsJSON>);
  private _PUT: ((url: string, body: any) => Promise<request.ResponseAsJSON>);

  ////////////////////////////////////////////////////////////////
  // CONTENT
  ////////////////////////////////////////////////////////////////

  private _findPages(spaceKey: string, title: string): Promise<request.ResponseAsJSON> {
    return this._GET(`${this.baseUrl}/content?spaceKey=${spaceKey}&title=${title}&expand=${EXPAND}`);
  }

  private _findPageById(id: string): Promise<request.ResponseAsJSON> {
    return this._GET(`${this.baseUrl}/content/${id}?expand=${EXPAND}`);
  }

  async getPage(spaceKey: string, pageTitle: string): Promise<Page> {

    const res = await this._findPages(spaceKey, pageTitle);
    if (res.body.results === undefined || !Array.isArray(res.body.results))
      throw new Error("invalid result");
    if (res.body.results.length == 0)
      throw new Error("result is empty");
    return await res.body.results[0] as Page
  }

  async getPageById(id: string): Promise<Page> {

    const res = await this._findPageById(id);
    if (util.isUndefined(res.body))
      throw new Error("invalid result");
    return await res.body as Page
  }

  async getChildren(id: string): Promise<Array<Page>> {

    const res = await this._GET(`${this.baseUrl}/content/${id}/child/page?expand=${EXPAND}`);
    if (res.body.results === undefined || !Array.isArray(res.body.results))
      throw new Error("invalid result");
    if (res.body.results.length == 0)
      throw new Error("result is empty");
    return await res.body.results as Array<Page>
  }

  async getDescendents(id: string): Promise<Array<Page>> {

    // const res = await  this._GET( `${this.baseUrl}/content/${id}/child/page?expand=${EXPAND}` )
    const res = await this._GET(`${this.baseUrl}/content/${id}/descendant/page?expand=${EXPAND}`)

    if (res.body.results === undefined || !Array.isArray(res.body.results))
      throw new Error("invalid result")

    if (res.body.results.length == 0)
      throw new Error("result is empty")

    return res.body.results as Array<Page>;
  }

  async addPage(input: CreatePageInput): Promise<Page> {

    const res = await this._POST(`${this.baseUrl}/content`, input);
    return res.body as Page;
  }

  async updatePage(input: UpdatePageInput): Promise<Page> {

    const res = await this._PUT(`${this.baseUrl}/content/${input.id}`, input);
    return res.body as Page;
  }

  async removePage(id: string): Promise<Page> {
    const res = await this._DELETE(`${this.baseUrl}/content/${id}`);
    return res.body as Page;
  }

  async getAttachment(pageId: string, fileName: string): Promise<PageAttachment | null> {

    const res = await this._GET(`${this.baseUrl}/content/${pageId}/child/attachment?filename=${querystring.escape(fileName)}&expand=${EXPAND}`);
    if (res.body.results === undefined || !Array.isArray(res.body.results))
      throw new Error("invalid result");
    //if( res.body.results.length==0 ) throw new Error( "result is empty");      
    if (res.body.results.length == 0)
      return null;
    return res.body.results[0] as PageAttachment
  }

  async getAttachments(pageId: string, fileName: string): Promise<Array<PageAttachment>> {

    const res = await this._GET(`${this.baseUrl}/content/${pageId}/child/attachment?expand=${EXPAND}`);
    if (res.body.results === undefined || !Array.isArray(res.body.results))
      throw new Error("invalid result");
    if (res.body.results.length == 0)
      throw new Error("result is empty");
    return await res.body as Array<PageAttachment>
  }

  addAttachment(pageId: string, input: CreateAttachmentInput): Promise<PageAttachment> {

    let serviceUrl = (input.id) ?
      `${this.baseUrl}/content/${pageId}/child/attachment/${input.id}/data` :
      `${this.baseUrl}/content/${pageId}/child/attachment`;

    return new Promise((resolve, reject) => {
      request(
        serviceUrl,
        {
          headers: {
            'User-Agent': 'confluence-site-publisher',
            'X-Atlassian-Token': 'no-check'
          },
          method: 'POST',
          auth: this.auth, json: true,
          formData: {
            comment: input.comment,
            minorEdit: String(input.minorEdit),
            file: {
              value: input.content,
              options: {
                filename: input.filename,
                contentType: input.contentType
              }
            }
          },
        },
        (err, res, body) => {
          if (err) return reject(err);

          if (res.statusCode >= 400) {

            const msg = getHttpErrorMessage(res);

            let err: any = new Error(`${res.statusCode} - ${msg}`);
            err.code = res.statusCode;
            err.body = body;
            return reject(err);
          }

          const result = res.toJSON();

          if (result.body.results===undefined) return resolve(result.body as PageAttachment);

          if (!Array.isArray(result.body.results)) throw new Error("invalid result");
          if (result.body.results.length == 0) throw new Error("result is empty");

          return resolve(result.body.results[0] as PageAttachment);


        });
    });
  }

  /**
   * Adds a label to the object with the given ContentEntityObject ID.
   */
  async addLabelByName(page: Model.Page, ...labels: string[]): Promise<boolean> {

    let input: Array<PageLabel> = labels.map(l => { return { prefix: 'global', name: l } as PageLabel });

    const res = await this._POST(`${this.baseUrl}/content/${page.id}/label`, input);
    return true;

  }

}

export async function create(config: BaseConfig, credentials: Credentials /*, ConfluenceProxy proxyInfo, SSLCertificateInfo sslInfo*/): Promise<RESTConfluenceService> {
  if (config == null) throw "config argument is null!";
  if (credentials == null) throw "credentials argument is null!";

  const confluence = new Confluence(config, credentials)

  return new RESTConfluenceService(confluence, credentials)

}


class RESTConfluenceService/*Impl*/ implements ConfluenceService {

  constructor(public connection: Confluence, credentials: Credentials) {
  }

  get credentials(): Credentials {
    return this.credentials;
  }

  async getPage(spaceKey: string, pageTitle: string): Promise<Model.Page> {
    const p = await this.connection.getPage(spaceKey, pageTitle);
    return page2Model(p);
  }

  async getPageByTitle(parentPageId: string, title: string): Promise<Model.PageSummary> {
    if (parentPageId == null) throw "parentPageId argument is null!";
    if (title == null) throw "title argument is null!";

    const children = await this.connection.getChildren(parentPageId);
    for (let i = 0; i < children.length; ++i) {
      if (title === children[i].title) {
        return page2Model(children[i])
      }
    }
    return await Promise.reject(util.format('page "%s" not found!', title));
  }

  async getPageById(pageId: string): Promise<Model.Page> {
    if (pageId == null) throw "pageId argument is null!";
    const p = await this.connection.getPageById(pageId);
    return page2Model(p);
  }

  async getDescendents(pageId: string): Promise<Array<Model.PageSummary>> {
    const p = await this.connection.getDescendents(pageId);
    return p.map(page2Model);
  }

  async removePageById(pageId: string): Promise<boolean> {
    const p = await this.connection.removePage(pageId);
    return true;
  }

  removePage(parentPage: Model.Page, title: string): Promise<boolean> {
    throw new Error("removePage not implemented yet");;
  }

  async addLabelsByName(page: Model.Page, ...labels: string[]): Promise<boolean> {
    return await this.connection.addLabelByName(page, ...labels);
  }

  async getAttachment(pageId: string, name: string, version: string): Promise<Model.Attachment | null> {
    const att = await this.connection.getAttachment(pageId, name);
    return (att) ? attachment2Model(att) : null;
  }

  async addAttachment(page: Model.Page, attachment: Model.Attachment, content: Stream): Promise<Model.Attachment> {

    const a = await this.connection.addAttachment(String(page.id), {
      id: attachment.id,
      comment: attachment.comment,
      minorEdit: false,
      contentType: attachment.contentType,
      filename: attachment.fileName,
      content: content
    });
    return attachment2Model(a);
  }

  /**
   * update content
   * 
   * @param page 
   * @param content 
   */
  async storePageContent(page: Model.Page, content: ContentStorage): Promise<Model.Page> {
    if (content == null) {
      throw "content argument is null!";
    }


    let p: UpdatePageInput = model2Page(page);

    p.version.number = Number(page.version) + 1;

    p.body = {
      storage: {
        representation: content.representation,
        value: content.value
      }
    }

    const p_2 = await this.connection.updatePage(p);
    return page2Model(p_2);
  }

  /**
   * add new page
   * 
   * @param page 
   * 
   */
  async addPage(page: Model.Page): Promise<Model.Page> {
    let p: CreatePageInput = model2Page(page);

    p.ancestors = [{ id: page.parentId }];

    const p_2 = await this.connection.addPage(p);
    return page2Model(p_2);
  }

  async close(): Promise<boolean> {
    return true
  }


}


const __MODULE_TEST__ = false;

import { createReadStream } from 'fs';
import { join } from 'path';
if (__MODULE_TEST__) {


  async function main() {

    try {

      let c = await create({
        protocol: 'http',
        //host:'192.168.0.11',
        host: 'localhost',
        port: 8090,
        path: 'rest/api'
      }, {
        username: 'admin',
        password: 'admin'
      });

      const getHomeRes = await c.getPage('TEST', 'Home');
      if (getHomeRes && getHomeRes.id) {
        const addLabelRes = await c.addLabelsByName(getHomeRes, 'label1', 'label2', 'label3');
        const delPageRes = await c.removePageById(String(getHomeRes.id))
      }

      const getPageRes = await c.getPage('TEST', 'TEST')

      console.log("GETPAGE RESPONSE\n", getPageRes);


      const addPageRes = await c.addPage({
        title: 'Home',
        parentId: getPageRes.id,
        space: getPageRes.space,
        //version: 1
      });

      console.log("CREATEPAGE RESPONSE\n", addPageRes);

      const addLabelRes = await c.addLabelsByName(addPageRes, 'label1', 'label2');

      const addAttRes0 = await c.addAttachment(addPageRes, {
        comment: "test1",
        contentType: 'application/pdf',
        fileName: 'notation_guide1.pdf',
      }, createReadStream(join(__dirname, '..', 'site', 'Notation Guide.pdf')))

      const addAttRes = await c.addAttachment(addPageRes, {
        comment: "test",
        contentType: 'application/pdf',
        fileName: 'notation_guide.pdf',
      }, createReadStream(join(__dirname, '..', 'site', 'Notation Guide.pdf')))

      console.log("ADDATTACHMENT RESPONSE\n", addPageRes);
      console.dir(addAttRes, { depth: 5 });

      let storePageRes = await c.storePageContent(addPageRes, {
        representation: Representation.WIKI,
        value: 'h1. HELLO WORLD 2!'
      })

      await c.storePageContent(storePageRes, {
        representation: Representation.WIKI,
        value: 'h1. HELLO WORLD 3!'
      })

      let getAttRes = await c.connection.getAttachment(addPageRes.id as string, 'notation_guide.pdf');


      console.log("GETATTACHMENT RESPONSE");
      console.dir(getAttRes, { depth: 5 });

    }
    catch (e) {
      console.error("ERROR\n", e);
    }

  }

  main();

}

