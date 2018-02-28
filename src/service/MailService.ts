import * as _ from 'lodash'
import axios from 'axios'
import { VALIDATE, Checker } from 'hinos-validation'
import { MONGO, Mongo, Uuid, Collection } from 'hinos-mongo'
import HttpError from '../common/HttpError'
import { MailConfig, MailConfigService, MailAccessTokenConfig } from './MailConfigService'
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
  // fileserv?: string
}

// @Thanh bo sau khi send qua token
// const MailConfigDefault = {
//   gmail: {
//     host: 'smtp.gmail.com',
//     port: 465,
//     secure: true,
//     auth: {
//       type: 'OAuth2'
//     }
//   }
// }

@Collection('Mail')
/* tslint:disable */
export class Mail {
  _id?: Uuid
  config_id?: Uuid
  config?: MailAccessTokenConfig
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
  config?: MailConfig | MailAccessTokenConfig
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
    const e = {} as MailCached
    if (!_e.retry_at) e.retry_at = new Date().getTime()
    if (_e.retry_at instanceof Date) e.retry_at = _e.retry_at.getTime()
    _.merge(e, _.pick(_e, ['_id', 'subject', 'text', 'html', 'from', 'to', 'cc', 'attachments', 'status', 'config']))
    if (!_e.config && _e.config_id) {
      const config = await MailConfigService.get(_e.config_id)
      if (config) e.config = config.config
    }
    return JSON.stringify(e)
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
        _id: 1, config_id: 1, config: 1, subject: 1, text: 1, html: 1, from: 1, to: 1, cc: 1, attachments: 1, retry_at: 1, status: 1
      },
      $recordsPerPage: 0,
      $sort: {
        updated_at: 1
      }
    })
    let cached = {} as any
    for (let m of mails) {
      cached[m._id.toString()] = await MailCached.castToCached(m)
    }
    await MailService.redis.hset('mail.temp', cached)
    MailService.schedule()
  }

  static async test(mail: Mail, config) {
    await MailService.sendMail(mail, config)
  }

  static async find(fil = {}) {
    const rs = await MailService.mongo.find<Mail>(Mail, fil)
    return rs
  }

  static async get(_id: any, fields) {
    const rs = await MailService.mongo.get<Mail>(Mail, _id, fields)
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

  @VALIDATE(async (body: Mail) => {
    body._id = Mongo.uuid() as Uuid
    await Checker.option(body, 'template_id', Uuid, undefined, async () => {
      const mail = await MailTemplateService.get(body.template_id)
      _.merge(body, _.pick(mail, ['subject', 'text', 'html', 'config_id', 'from']))
    })
    if (body.config) {
      Checker.required(body, 'config', Object)
      delete body.config_id
    } else {
      Checker.required(body, 'config_id', Uuid)
    }
    Checker.required(body, 'project_id', Uuid)
    Checker.required(body, 'account_id', Uuid)
    Checker.required(body, 'subject', String)
    Checker.option(body, 'text', String, undefined, () => {
      if (!body.text) Checker.required(body, 'html', String)
    })
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
  static async insert(body: Mail, params = {} as any) {
    if (body.template_id) {
      body.subject = MailService.replaceVar(body.subject, params)
      if (body.html) {
        body.html = MailService.replaceVar(body.html, params)
      } else if (body.text) {
        body.text = MailService.replaceVar(body.text, params)
      }
    }
    const rs = await MailService.mongo.insert<Mail>(Mail, body)
    await MailService.redis.hset('mail.temp', {
      [rs._id.toString()]: await MailCached.castToCached(rs)
    })
    return rs
  }

  @VALIDATE((body: Mail) => {
    Checker.required(body, '_id', Object)
    if (body.config) {
      Checker.required(body, 'config', Object)
      delete body.config_id
    } else if (body.config_id) {
      Checker.required(body, 'config_id', Uuid)
      delete body.config
    }
    body.status = Mail.Status.PENDING
    body.updated_at = new Date()
    body.retry_at = undefined
  })
  static async resend(body: Mail) {
    const rs = await MailService.mongo.update<Mail>(Mail, body, { return: true }) as Mail
    if (!rs) throw HttpError.NOT_FOUND('Could not found item to update')
    await MailService.redis.hdel('mail.temp', [rs._id.toString()])
    rs.retry_at = undefined
    rs.status = body.status
    await MailService.redis.hset('mail.temp', {
      [rs._id.toString()]: await MailCached.castToCached(rs)
    })
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
    const old = await MailService.mongo.delete<Mail>(Mail, _id, { return: true }) as Mail
    if (!old) throw HttpError.NOT_FOUND('Could not found item to delete')
    await MailService.redis.hdel('mail.temp', [old._id.toString()])
  }

  // private static async sendMail(mailOptions: Mail, config: MailConfig) {
  //   try {
  //     await Utils.executeCmd(`go run ${path.resolve('mail_sending.go')} ` + `"${new Buffer(JSON.stringify(Object.assign({}, mailOptions, { config: config }))).toString('base64')}"`)
  //   } catch (e) {
  //     console.log(e)
  //     throw HttpError.INTERNAL(e.message)
  //   }
  // }

  private static async sendMailViaToken(mail: Mail, config: MailAccessTokenConfig) {
    const encodedMail = new Buffer(
      `Content-Type: ${mail.html ? 'text/html' : 'text/plain'}; charset=\"UTF-8\"\n` +
      "MIME-Version: 1.0\n" +
      "Content-Transfer-Encoding: 7bit\n" +
      `to: ${mail.to}\n` +
      `from: ${mail.from}\n` +
      `subject: ${mail.subject}\n\n` +

      `${mail.html || mail.text}`
    ).toString("base64").replace(/\+/g, '-').replace(/\//g, '_')
    try {
      await axios.post('https://www.googleapis.com/gmail/v1/users/me/messages/send',
        {
          raw: encodedMail
        }, {
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${config.accessToken}`
          }
        })
    } catch (e) {
      if (e.response) throw HttpError.INTERNAL(e.response.data.error)
      throw e
    }
    return null
  }

  private static async sendMail(mailOptions: Mail, config: MailConfig | MailAccessTokenConfig) {
    return new Promise((resolve, reject) => {
      try {
        try {
          if ((config as MailAccessTokenConfig).accessToken) {
            MailService.sendMailViaToken(mailOptions, config as MailAccessTokenConfig).then(resolve).catch(reject)
          } else {
            const transporter = nodemailer.createTransport(config as MailConfig)
            transporter.sendMail(mailOptions as nodemailer.SendMailOptions, (error, info) => {
              if (error) return reject(HttpError.INTERNAL(error.message))
              resolve(info)
            })
          }
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
    const rs = await MailService.redis.hget('mail.temp')
    if (rs && Object.keys(rs).length > 0) {
      for (let _id in rs) {
        const e = MailCached.castToObject(rs[_id]) as any
        if (!e.retry_at || e.retry_at <= now) {
          await MailService.redis.hdel('mail.temp', [_id])
          try {
            if (!e.config) {
              e.status = Mail.Status.ERROR[Mail.Status.ERROR.length - 1]
              throw HttpError.NOT_FOUND('Could not found mail config')
            }
            await MailService.sendMail(e, e.config)
            e.status = Mail.Status.PASSED
            e.error = undefined
            e.retry_at = undefined
          } catch (err) {
            e.status--
            e.error = err
            if (Mail.Status.ERROR.includes(e.status)) {
              e.retry_at = new Date(new Date().getTime() + (AppConfig.app.retrySending * (e.status - 1) * -1))
              await MailService.redis.hset('mail.temp', {
                [_id]: await MailCached.castToCached(e)
              })
            } else {
              e.retry_at = undefined
            }
          }
          await MailService.mongo.update(Mail, _.omit(e, ['config']))
        }
      }
    }
    setTimeout(MailService.schedule, AppConfig.app.scanTimeout)
  }

}
