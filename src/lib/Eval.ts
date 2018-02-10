import * as URL from 'url'

export class Var {
  appendTxt = ''
  prependTxt = ''
  constructor(public name: string, public value?: any) { }
  get prefix() {
    return this.name.indexOf('this.') === 0 ? '' : '$var.'
  }
  prepend(prependTxt: string) {
    this.prependTxt = prependTxt
  }
  append(appendTxt) {
    this.appendTxt = appendTxt
  }
  toString() {
    return `${this.prependTxt}\$\{${this.prefix}${this.name}\}${this.appendTxt}`
  }
}
export function $var(name: string) {
  return new Var(name)
}

export class Url {
  method: 'GET' | 'POST' | 'PUT' | 'HEAD' | 'DELETE' | 'PATCH'
  vars: (Var | string)[]
  requestUrl: string
  requestPath: string

  constructor(public url: string, ..._vars: (Var | string)[]) {
    this.vars = _vars
    this.requestPath = URL.parse(url).path
    this.setRequestUrl(url)
  }

  setRequestUrl(url) {
    this.requestUrl = url
  }
}

export function GET(url: string, ...vars: (Var | string)[]) {
  const _url = new Url(url, ...vars)
  _url.method = 'GET'
  return _url
}
export function POST(url: string, ...vars: (Var | string)[]) {
  const _url = new Url(url, ...vars)
  _url.method = 'POST'
  return _url
}
export function PUT(url: string, ...vars: (Var | string)[]) {
  const _url = new Url(url, ...vars)
  _url.method = 'PUT'
  return _url
}
export function HEAD(url: string, ...vars: (Var | string)[]) {
  const _url = new Url(url, ...vars)
  _url.method = 'HEAD'
  return _url
}
export function DELETE(url: string, ...vars: (Var | string)[]) {
  const _url = new Url(url, ...vars)
  _url.method = 'DELETE'
  return _url
}
export function PATCH(url: string, ...vars: (Var | string)[]) {
  const _url = new Url(url, ...vars)
  _url.method = 'PATCH'
  return _url
}
