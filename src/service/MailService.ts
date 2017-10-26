import * as _ from 'lodash'
import { VALIDATE, Checker } from 'hinos-validation'
import { MONGO, Mongo, Uuid, Collection } from 'hinos-mongo'
import HttpError from '../common/HttpError'
import { MailConfig, MailConfigService } from './MailConfigService'
import * as nodemailer from 'nodemailer'

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
  attachments?: Attachments[]
  error?: any
  send_at?: Date
  created_at?: Date
  updated_at?: Date
}
/* tslint:enable */

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

  private static tempMails = [] as any

  static async loadIntoCached() {
    const mails = await MailService.mongo.find<Mail>(Mail, {
      $where: {
        status: {
          $in: [...Mail.Status.ERROR, Mail.Status.PENDING]
        }
      },
      $recordsPerPage: 0,
      $sort: {
        updated_at: 1
      }
    })
    MailService.tempMails = MailService.tempMails = mails.map(e => {
      e.send_at = e.send_at.getTime() as any
      return e
    })
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

  @VALIDATE((body: Mail) => {
    body._id = Mongo.uuid() as Uuid
    Checker.required(body, 'config_id', Uuid)
    Checker.required(body, 'project_id', Uuid)
    Checker.required(body, 'account_id', Uuid)
    Checker.required(body, 'subject', String)
    Checker.option(body, 'text', String, undefined, () => {
      // Incase body.text === ''
      if (!body.text) Checker.required(body, 'html', String)
    })
    Checker.required(body, 'from', String)
    Checker.required(body, 'to', Array)
    if (body.to.length === 0) throw new Error(`"To" must be not empty`)
    Checker.option(body, 'cc', Array, [])
    Checker.option(body, 'attachments', Array, [])
    body.status = Mail.Status.PENDING
    body.created_at = new Date()
    body.updated_at = body.created_at
    body.send_at = body.updated_at
  })
  static async insert(body: Mail) {
    const rs = await MailService.mongo.insert<Mail>(Mail, body)
    MailService.tempMails.push(_.merge({}, rs, {
      send_at: rs.send_at.getTime()
    }))
    return rs
  }

  @VALIDATE((body: Mail) => {
    Checker.required(body, '_id', Object)
    body.status = Mail.Status.PENDING
    body.updated_at = new Date()
    body.send_at = body.updated_at
  })
  static async resend(body: Mail) {
    const rs = await MailService.mongo.update<Mail>(Mail, body, { return: true })
    if (!rs) throw HttpError.NOT_FOUND('Could not found item to update')
    const idx = MailService.tempMails.findIndex(e => e._id.toString() === body._id.toString())
    MailService.tempMails.splice(idx, 1)
    rs.status = body.status
    rs.send_at = body.send_at.getTime() as any
    MailService.tempMails.push(rs)
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
    const rs = await MailService.mongo.delete(Mail, _id)
    if (rs === 0) throw HttpError.NOT_FOUND('Could not found item to delete')
    const idx = MailService.tempMails.findIndex(e => e._id.toString() === _id._id.toString())
    MailService.tempMails.splice(idx, 1)
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
    const listEmail = MailService.tempMails.filter(e => !e.send_at || e.send_at <= now)
    if (listEmail.length > 0) {
      for (const e of listEmail) {
        try {
          const config = await MailConfigService.get(e.config_id)
          await MailService.sendMail(e, config.config)
          e.status = Mail.Status.PASSED
          e.error = undefined
        } catch (err) {
          e.status--
          e.error = err
        }
        if ([Mail.Status.PASSED, Mail.Status.FAILED].includes(e.status)) {
          const idx = MailService.tempMails.findIndex(_e => _e._id.toString() === e._id.toString())
          MailService.tempMails.splice(idx, 1)
        }
        await MailService.mongo.update(Mail, e)
      }
    }
    setTimeout(MailService.schedule, AppConfig.app.scanTimeout)
  }

}
