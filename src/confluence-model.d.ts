
declare namespace Model {

  export interface Attachment {
    id?:string;
    fileName:string;
    contentType:string;
    comment:string;
    created?:Date;
  }

  export interface PageSummary {
    id?:string;
    title:string;
    space:string;
    parentId:any;
  }

  export interface Page extends PageSummary {
    version?:number;
    content?:string;
  }

}

