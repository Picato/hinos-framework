import * as _ from 'lodash'
import { VALIDATE, Checker } from 'hinos-validation'
import { MONGO, Mongo, Uuid, Collection } from 'hinos-mongo'
import HttpError from '../common/HttpError'
import { MailConfig, MailConfigService } from './MailConfigService'
import { MailTemplateService } from './MailTemplateService'
import * as nodemailer from 'nodemailer'
import { REDIS, Redis } from 'hinos-redis'

/************************************************
 ** MailService || 4/10/2017, 10:19:24 AM **
 ************************************************/

export interface Attachments {
  path?: string,
  filename?: string,
  content?: string,
  contentType?: string,
  encoding?: string,
  raw?: string
}

@Collection('Mail')
/* tslint:disable */
export class Mail {
  _id?: Uuid
  config_id?: Uuid
  project_id?: Uuid
  account_id?: Uuid
  subject?: string
  status?: number
  text?: string
  html?: string
  from?: string
  to?: string[]
  cc?: string[]
  template_id?: Uuid
  attachments?: Attachments[]
  error?: any
  retry_at?: Date
  created_at?: Date
  updated_at?: Date
}
/* tslint:enable */

/* tslint:disable */
export class MailCached {
  _id?: Uuid | string
  config?: MailConfig
  subject?: string
  status?: number
  text?: string
  html?: string
  from?: string
  to?: string[]
  cc?: string[]
  attachments?: Attachments[]
  retry_at?: number

  static async castToCached(_e: Mail): Promise<string> {
    const e = _.cloneDeep(_e)
    if (!e.retry_at) e.retry_at = new Date()
    if (e.retry_at instanceof Date) e.retry_at = e.retry_at.getTime()
    if (e.attachments && e.attachments.length > 0) {
      e.attachments = e.attachments.map(e => _.pick(e, ['path', 'filename', 'content', 'contentType', 'encoding', 'raw']))
    }
    e.config = await MailConfigService.get(e.config_id)
    return JSON.stringify(_.pick(e, ['_id', 'config', 'subject', 'text', 'html', 'from', 'to', 'cc', 'attachments', 'retry_at', 'status']))
  }
  static castToObject(_e: string): MailCached {
    const e = JSON.parse(_e)
    e._id = Mongo.uuid(e._id)
    return e as MailCached
  }
}

export namespace Mail {
  export const Status = {
    PENDING: 0,
    PASSED: 1,
    FAILED: -3,
    ERROR: [-1, -2]
  }
}

export class MailService {
  @MONGO()
  private static mongo: Mongo

  @REDIS()
  private static redis: Redis

  static async loadIntoCached() {
    await MailService.redis.del('mail.temp')
    const mails = await MailService.mongo.find<Mail>(Mail, {
      $where: {
        status: {
          $in: [...Mail.Status.ERROR, Mail.Status.PENDING]
        }
      },
      $fields: {
        _id: 1, config_id: 1, subject: 1, text: 1, html: 1, from: 1, to: 1, cc: 1, attachments: 1, retry_at: 1, status: 1
      },
      $recordsPerPage: 0,
      $sort: {
        updated_at: 1
      }
    })
    await MailService.redis.rpush('mail.temp', await Promise.all(mails.map(async (e) => {
      return await MailCached.castToCached(e)
    })))
    MailService.schedule()
  }

  static async test(mail: Mail, config) {
    await MailService.sendMail(mail, config)
  }

  static async find(fil = {}) {
    const rs = await MailService.mongo.find<Mail>(Mail, fil)
    return rs
  }

  static async get(_id: any) {
    const rs = await MailService.mongo.get<Mail>(Mail, _id, { project_id: 0 })
    return rs
  }

  private static replaceVar(cnt, obj) {
    let ev = []
    for (let k in obj) {
      ev.push('var ' + k + ' = ' + JSON.stringify(obj[k]))
    }
    return eval(`(() => {
      ${ev.join('\n')}
      return \`${cnt}\` })()`)
  }

  @VALIDATE(async (body: Mail, _this = {} as any) => {
    body._id = Mongo.uuid() as Uuid
    await Checker.option(body, 'template_id', Uuid, undefined, async () => {
      const mail = await MailTemplateService.get(body.template_id)
      _.merge(body, _.pick(mail, ['subject', 'text', 'html', 'config_id', 'from']))
    })
    Checker.required(body, 'config_id', Uuid)
    Checker.required(body, 'project_id', Uuid)
    Checker.required(body, 'account_id', Uuid)
    Checker.required(body, 'subject', String)
    Checker.option(body, 'text', String, undefined, () => {
      if (!body.text) Checker.required(body, 'html', String)
    })
    if (body.template_id) {
      body.subject = MailService.replaceVar(body.subject, _this)
      if (body.html) {
        body.html = MailService.replaceVar(body.html, _this)
      } else if (body.text) {
        body.text = MailService.replaceVar(body.text, _this)
      }
    }
    Checker.required(body, 'from', String)
    if (!/^[_-\w]+$/.test(body.from)) throw HttpError.BAD_REQUEST('from must be alphabet, digit, _ or -')
    Checker.required(body, 'to', Array)
    if (body.to.length === 0) throw new Error(`"To" must be not empty`)
    Checker.option(body, 'cc', Array, [])
    Checker.option(body, 'attachments', Array, [])
    body.attachments = body.attachments.filter(e => Object.keys(e).length > 0)
    body.status = Mail.Status.PENDING
    body.created_at = new Date()
    body.updated_at = body.created_at
  })
  static async insert(body: Mail, _this?: any) {
    const rs = await MailService.mongo.insert<Mail>(Mail, body)
    await MailService.redis.rpush('mail.temp', await MailCached.castToCached(rs))
    return rs
  }

  @VALIDATE((body: Mail) => {
    Checker.required(body, '_id', Object)
    body.status = Mail.Status.PENDING
    body.updated_at = new Date()
    body.retry_at = undefined
  })
  static async resend(body: Mail) {
    const rs = await MailService.mongo.update<Mail>(Mail, body, { return: true })
    if (!rs) throw HttpError.NOT_FOUND('Could not found item to update')
    await MailService.redis.lrem('mail.temp', await MailCached.castToCached(rs))
    rs.retry_at = undefined
    rs.status = body.status
    await MailService.redis.rpush('mail.temp', await MailCached.castToCached(rs))
  }

  // @VALIDATE((body: Mail) => {
  //   Checker.required(body, '_id', Uuid)
  //   Checker.option(body, 'config_id', Uuid)
  //   Checker.option(body, 'subject', String)
  //   Checker.option(body, 'text', String)
  //   Checker.option(body, 'html', String)
  //   Checker.option(body, 'from', String)
  //   Checker.option(body, 'to', Array)
  //   Checker.option(body, 'cc', Array)
  //   Checker.option(body, 'attachments', Array)
  //   body.updated_at = new Date()
  // })
  // static async update(body: Mail) {
  //   const rs = await MailService.mongo.update(Mail, body)
  //   if (rs === 0) throw HttpError.NOT_FOUND('Could not found item to update')
  // }

  @VALIDATE((_id: any) => {
    Checker.required(_id, [, '_id'], Object)
  })
  static async delete(_id: any) {
    const old = await MailService.mongo.delete<Mail>(Mail, _id, { return: true })
    if (!old) throw HttpError.NOT_FOUND('Could not found item to delete')
    await MailService.redis.lrem('mail.temp', await MailCached.castToCached(old))
  }

  private static async sendMail(mailOptions: Mail, config: MailConfig) {
    return new Promise((resolve, reject) => {
      try {
        const transporter = nodemailer.createTransport(config)
        try {
          transporter.sendMail(mailOptions as nodemailer.SendMailOptions, (error, info) => {
            if (error) return reject(HttpError.INTERNAL(error.message))
            resolve(info)
          })
        } catch (e) {
          reject(HttpError.INTERNAL(e))
        }
      } catch (e) {
        reject(HttpError.INTERNAL(e))
      }
    })
  }

  private static async schedule() {
    const now = new Date().getTime()
    const rs = await MailService.redis.lrange('mail.temp')
    if (rs.length > 0) {
      for (const e of rs.map(MailCached.castToObject).filter(e => !e.retry_at || e.retry_at <= now)) {
        try {
          const config = await MailConfigService.get(e.config_id)
          await MailService.sendMail(e, config.config)
          await MailService.redis.lrem('mail.temp', await MailCached.castToCached(e))
          e.status = Mail.Status.PASSED
          e.error = undefined
          e.retry_at = undefined
        } catch (err) {
          if (Mail.Status.ERROR.includes(e.status - 1)) {
            await MailService.redis.lrem('mail.temp', await MailCached.castToCached(e))
            e.retry_at = new Date(new Date().getTime() + (AppConfig.app.retrySending * (e.status - 1) * -1))
            e.status--
            await MailService.redis.rpush('mail.temp', await MailCached.castToCached(e))
          } else {
            await MailService.redis.lrem('mail.temp', await MailCached.castToCached(e))
            e.status--
            e.retry_at = undefined
          }
          e.error = err
        }
        await MailService.mongo.update(Mail, e)
      }
    }
    setTimeout(MailService.schedule, AppConfig.app.scanTimeout)
  }

}
