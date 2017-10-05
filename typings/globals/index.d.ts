declare interface Var { }
declare interface Url { }
declare interface Doc {
  i18doc?: any
  i18ignore?: any
  group?: string
  title?: string
  order?: number
  note?: string | string[]
  tags?: string[] | string
}
declare interface Api {
  key?: string
  des?: string
  method?: 'POST' | 'PUT' | 'GET' | 'HEAD' | 'DELETE' | 'PATCH'
  url?: string | Url
  headers?: { [key: string]: any }
  body?: any
  extends?: string | string[]
  var?: string | { [key: string]: any }
  disabled?: boolean
  doc?: Doc
}
declare interface Testcase {
  des: string
  key?: string
  disabled?: boolean
  apis?: Api[]
  var?: string | { [key: string]: any }
}
declare function INCLUDE(path: string): Api[]
declare function API(des: string, options: Api, meta?: { key?: string, extends?: string | string[] }): Api
declare function DOC(title: string, group: string, options: Api, meta?: { key?: string, extends?: string | string[] }): Api
declare function DOC(title: string, group: string, tags: string | string[], options: Api, meta?: { key?: string, extends?: string }): Api
declare function Multipart(form: any): FormData
declare function $var(name: string): Var

declare function GET(url: string, ...vars: (Var | string)[]): Url
declare function POST(url: string, ...vars: (Var | string)[]): Url
declare function PUT(url: string, ...vars: (Var | string)[]): Url
declare function HEAD(url: string, ...vars: (Var | string)[]): Url
declare function DELETE(url: string, ...vars: (Var | string)[]): Url
declare function PATCH(url: string, ...vars: (Var | string)[]): Url
