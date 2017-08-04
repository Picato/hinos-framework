import * as _ from 'lodash'
import { Mongo } from 'hinos-mongo'
import { ExpensiveNote, SpendingsService } from './SpendingsService'

/************************************
 ** SERVICE:      ExpensiveNoteController
 ** AUTHOR:       Unknown
 ** CREATED DATE: 12/30/2016, 11:32:25 PM
 *************************************/

export async function changeToNewServer() {
  Mongo({ key: 'sctNew', url: 'mongodb://localhost:27017/sochitieu' })
  Mongo({ key: 'sctOld', url: 'mongodb://localhost:27017/sochitieuOld' })
  Mongo({ key: 'oauthOld', url: 'mongodb://localhost:27017/oauthv2Old' })
  Mongo({ key: 'oauthNew', url: 'mongodb://localhost:27017/oauth' })
  const oldProjectId = Mongo.uuid('58b689a97c949123ea7360a0')
  const newProjectId = Mongo.uuid('597d7ded1c07314f60df9dcc')
  const newRoleId = Mongo.uuid('597d7ded1c07314f60df9dce')
  const oldAccs = await Mongo.pool('oauthOld').find<any>('account', {
    $where: {
      'project_id': oldProjectId,
      username: {
        $ne: 'have.ice@gmail.com'
      },
      is_nature: {
        $exists: false
      }
    },
    $recordsPerPage: 0
  })
  for (let i in oldAccs) {
    let newAcc = await Mongo.pool('oauthNew').get<any>('Account', {
      'project_id': newProjectId,
      _id: oldAccs[i]._id
    })
    if (!newAcc) {
      oldAccs[i].username = oldAccs[i].username.trim()
      oldAccs[i].old_id = oldAccs[i]._id
      oldAccs[i].project_id = newProjectId
      oldAccs[i].role_ids = [newRoleId]
      newAcc = await Mongo.pool('oauthNew').insert<any>('Account', oldAccs[i])
    }
    const oldItems = await Mongo.pool('sctOld').find<ExpensiveNote>('ExpensiveNote', {
      $where: {
        user_id: newAcc.old_id
      }
    })
    if (oldItems && oldItems.length > 0) {
      const newItems = oldItems.map(e => {
        e.user_id = newAcc._id
        return e
      })
      await Mongo.pool('sctNew').delete('ExpensiveNote', {
        user_id: newAcc._id
      }, { multiple: true })
      await Mongo.pool('sctNew').insert('ExpensiveNote', newItems)
    }
  }
  return 'Done'
}

export async function merge(email, auth) {
  Mongo({ key: 'old', url: 'mongodb://localhost:27017/savemoney' })
  if (!email) return
  const users = []
  let wallets = await Mongo.pool('old').find<any>('Wallet', {
    $where: {
      email: email,
      removed: 0
    },
    $recordsPerPage: -1
  })
  let tmpWallet = {}
  if (wallets.length !== 0) {
    wallets = wallets.map((e) => {
      tmpWallet[e.ID] = _.clone(e)
      e.created_at = new Date(e.createdAt)
      e.updated_at = new Date(e.updatedAt)
      e.type = e.avail
      delete e.avail
      delete e.email
      delete e.createdAt
      delete e.updatedAt
      delete e.is_sync
      delete e.removed
      delete e.objectId
      delete e.ID
      delete e.server_id
      return e
    })
  }
  let tmpTypeSpending = {}
  let typeSpendings = await Mongo.pool('old').find<any>('TypeSpending', {
    $where: {
      email: email,
      removed: 0
    },
    $sort: {
      parent_id: 1
    },
    $recordsPerPage: -1
  })
  if (typeSpendings.length !== 0) {
    typeSpendings = typeSpendings.map((e) => {
      tmpTypeSpending[e.ID] = _.clone(e)
      e.created_at = new Date(e.createdAt)
      e.updated_at = new Date(e.updatedAt)
      e.uname = SpendingsService.toUnsign(e.name)
      e.parent_id = (!e.parent_id || e.parent_id.length === 0 || !tmpTypeSpending[e.parent_id]) ? null : tmpTypeSpending[e.parent_id]._id
      delete e.email
      delete e.createdAt
      delete e.updatedAt
      delete e.is_sync
      delete e.removed
      delete e.objectId
      delete e.ID
      delete e.server_id
      return e
    })
  }
  let spendings = await Mongo.pool('old').find<any>('Spending', {
    $where: {
      email: email,
      removed: 0
    },
    $sort: {
      input_date: -1
    },
    $recordsPerPage: -1
  })
  if (spendings.length !== 0) {
    spendings = spendings.map((e) => {
      let typeSpending = tmpTypeSpending[e.type_spending_id]
      let wallet = tmpWallet[e.wallet_id]
      if (!typeSpending || !wallet) return null
      e.created_at = new Date(e.createdAt)
      e.updated_at = new Date(e.updatedAt)
      e.input_date = new Date(e.created_date)
      e.date = e.input_date.getDate()
      e.month = e.input_date.getMonth()
      e.year = e.input_date.getFullYear()
      e.udes = e.des ? SpendingsService.toUnsign(e.des) : null
      e.type_spending_id = typeSpending._id
      e.wallet_id = wallet._id
      e.sign_money = e.is_report ? (e.money * e.type) : 0
      delete e.is_report
      delete e.created_day
      delete e.created_date
      delete e.created_month
      delete e.created_year
      delete e.email
      delete e.createdAt
      delete e.updatedAt
      delete e.is_sync
      delete e.removed
      delete e.objectId
      delete e.ID
      delete e.server_id
      return e
    }).filter((e) => {
      return e !== null
    })
  }
  if (spendings.length !== 0 || wallets.length !== 0 || typeSpendings.length !== 0) {
    let User = {
      user_id: Mongo.uuid(auth.accountId),
      spendings,
      wallets,
      type_spendings: typeSpendings
    }
    users.push(User)
    await Mongo.pool().insert<ExpensiveNote>(ExpensiveNote, users)
    return true
  }
  return false
}
