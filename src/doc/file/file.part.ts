import { HOST } from '../common'

const GROUP = 'FILE'
const i18doc = {
  '*._id': 'File ID'
}

export default [
  DOC('Upload file', GROUP, {
    i18doc: Object.assign({}, i18doc, {
      '$body': DOC.type('string | string[]').des('Link file(s) after upload. It data type base on file configuration'),
      '*.files': DOC.required().type('File | File[]').des('File uploading. It data type base on file configuration')
    }),
    note: [
      `You can add some params on querystring`,
      `<pre>`,
      `?<b>isStore=true</b>: Server auto save into disk. If you not set, server just save it in cached folder and auto remove after period time`,
      `?<b>fileName=filename.txt</b>: Rename file`,
      `</pre>`
    ],
    url: POST(`${HOST.FILE}/files/upload/:fileConfigId*`, $var('newfileconfig._id')),
    headers: {
      'content-type': 'multipart/form-data'
    },
    body: {
      files: Part(`C:\\test.jpg`)
    },
    var: {
      'newfile': $var('this.$body')
    }
  }, { extends: '#authRequestByToken', key: '#uploadFile' }),
  API('Upload new file to replace', {
    var: {
      'newfile1': $var('this.$body')
    }
  }, { extends: ['#uploadFile', '#authRequestByToken'] }),
  DOC('Store or replace file(s) after uploading to make sure it wont be removed after period time', GROUP, {
    i18doc: {
      'body.oldFiles': DOC.type('string | string[]').des('Old link file which you got after call api file uploading'),
      'body.files': DOC.required().type('string | string[]').des('New link file which you got after call api file uploading')
    },
    note: [
      `Store new file and remove old file`,
      `<pre>`,
      `<b>oldFiles</b>: The old files which you uploaded and store them before that. It will be removed to replace by new file`,
      `<b>files</b>: The new files which you upload and want to store it. It not be removed after the period time`,
      `</pre>`
    ],
    url: PUT(`${HOST.FILE}/files/store`),
    body: {
      oldFiles: $var('newfile1'),
      files: $var('newfile')
    }
  }, { extends: '#authRequestByToken' }),
  DOC('Remove file', GROUP, {
    i18doc: {
      'body.files': DOC.required().type('string | string[]').des('Link file which you got after call api file uploading')
    },
    url: PUT(`${HOST.FILE}/files/remove`),
    body: {
      files: $var('newfile')
    }
  }, { extends: '#authRequestByToken' })
]
