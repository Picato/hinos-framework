import * as _ from 'lodash'
import { VALIDATE, Checker } from 'hinos-validation'
import { ImageResize } from 'hinos-bodyparser'
import { MONGO, Mongo, Uuid, Collection } from 'hinos-mongo'
import HttpError from '../common/HttpError'
import { ConfigService, Config } from './ConfigService'
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
  created_at?: Date
  updated_at?: Date
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

  static async schedule() {
    const listEmail = await MailService.mongo.find<Mail>(Mail, {
      $where: {
        status: {
          $in: Mail.Status.ERROR.concat(Mail.Status.PENDING)
        }
      },
      $sort: {
        updated_at: 1
      }
    })
    if (listEmail.length > 0) {
      for (const e of listEmail) {
        try {
          const config = await ConfigService.get(e.config_id)
          let mail = _.cloneDeep(e)
          _.merge(mail, {
            cc: e.cc.join(', '),
            to: e.to.join(', ')
          })
          await MailService.sendMail(_.pick(mail, ['attachments', 'cc', 'from', 'html', 'subject', 'to', 'text']), config.config)
          e.status = Mail.Status.PASSED
        } catch (err) {
          e.status--
          e.error = err
        }
        await MailService.mongo.update<Mail>(Mail, e)
      }
    }
    setTimeout(MailService.schedule, AppConfig.app.scanTimeout)
  }

  private static async sendMail(mailOptions: Mail, config: Config) {
    return new Promise((resolve, reject) => {
      try {
        const transporter = nodemailer.createTransport(config);
        try {
          transporter.sendMail(mailOptions, (error, info) => {
            if (error) return reject(error);
            resolve(info);
          });
        } catch (e) {
          reject(HttpError.INTERNAL(e))
        }
      } catch (e) {
        reject(HttpError.INTERNAL(e));
      }
    });
  }

  static async find(fil = {}) {
    const rs = await MailService.mongo.find<Mail>(Mail, fil)
    return rs
  }

  static async get(_id: any) {
    const rs = await MailService.mongo.get<Mail>(Mail, _id)
    return rs
  }

  @VALIDATE((body: Mail) => {
    body._id = <Uuid>Mongo.uuid()
    Checker.required(body, 'config_id', Uuid)
    Checker.required(body, 'project_id', Uuid)
    Checker.required(body, 'account_id', Uuid)
    Checker.required(body, 'subject', String)
    Checker.option(body, 'text', String, undefined, undefined, e => Checker.required(body, 'html', String))
    Checker.required(body, 'from', String)
    Checker.required(body, 'to', Array)
    Checker.option(body, 'cc', Array, [])
    Checker.option(body, 'attachments', Array, [])
    body.status = Mail.Status.PENDING
    body.created_at = new Date()
    body.updated_at = new Date()
  })
  static async insert(body: Mail, validate?: Function) {
    const rs = await MailService.mongo.insert<Mail>(Mail, body) as Mail
    return rs
  }

  @VALIDATE((body: Mail) => {
    Checker.required(body, '_id', Object)
    body.status = Mail.Status.PENDING
    body.updated_at = new Date()
  })
  static async resend(body: Mail, validate?: Function) {
    const rs = await MailService.mongo.update<Mail>(Mail, body) as number
    if (rs === 0) throw HttpError.NOT_FOUND('Could not found item to update')
  }

  @VALIDATE((body: Mail) => {
    Checker.required(body, '_id', Uuid)
    Checker.option(body, 'config_id', Uuid)
    Checker.option(body, 'subject', String)
    Checker.option(body, 'text', String)
    Checker.option(body, 'html', String)
    Checker.option(body, 'from', String)
    Checker.option(body, 'to', Array)
    Checker.option(body, 'cc', Array)
    Checker.option(body, 'attachments', Array)
    body.updated_at = new Date()
  })
  static async update(body: Mail, validate?: Function) {
    const rs = await MailService.mongo.update<Mail>(Mail, body) as number
    if (rs === 0) throw HttpError.NOT_FOUND('Could not found item to update')
  }

  @VALIDATE((_id: Object) => {
    Checker.required(_id, [, '_id'], Object)
  })
  static async delete(_id: Object) {
    const rs = await MailService.mongo.delete<Mail>(Mail, _id) as number
    if (rs === 0) throw HttpError.NOT_FOUND('Could not found item to delete')
  }
}

