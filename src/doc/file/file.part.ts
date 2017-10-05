import { TAG } from '../common'
import * as fs from 'fs'

const GROUP = 'MAIL'

export default [
  DOC('Upload file', GROUP, TAG.ADMIN, {
    url: POST('http://service.clipvnet.com/files/upload/:fileConfigId?store=:isStore&name=:fileName', $var('newfileconfig._id'), false, 'imagename.png'),
    headers: {
      'content-type': 'multipart/form-data'
    },
    body: Multipart({
      files: fs.createReadStream(`C:\\test.jpg`)
    }),
    var: {
      'newfile': $var('this.$body')
    },
    doc: {
      note: [
        `:isStore: "true": Server auto save into disk, "false": Server just save it in cached folder and auto remove after period time`,
        `:fileName: Customize file name`,
        `$body: Return array<string> or string when you upload more than 2 files or 1 file`
      ]
    }
  }, { extends: '#authRequestByToken', key: '#uploadFile' }),
  API('Upload new file to replace', {
    url: POST('http://service.clipvnet.com/files/upload/:fileConfigId?store=:isStore&name=:fileName', $var('newfileconfig._id'), false, 'imagename.png'),
    headers: {
      'content-type': 'multipart/form-data'
    },
    body: Multipart({
      files: fs.createReadStream(`C:\\test.jpg`)
    }),
    var: {
      'newfile1': $var('this.$body')
    }
  }, { extends: ['#authRequestByToken'] }),
  DOC('Store file(s) after uploading to make sure it wont be removed after period time', GROUP, TAG.ADMIN, {
    url: PUT('http://service.clipvnet.com/files/store'),
    body: {
      oldFiles: $var('newfile1'),
      files: $var('newfile')
    },
    doc: {
      note: [
        `Store or update new one`,
        `oldFiles: The old files which you uploaded and store them before that. You should remove them when not use`,
        `files: The new files which you upload and want to store it`
      ]
    }
  }, { extends: '#authRequestByToken' }),
  DOC('Remove file', GROUP, TAG.ADMIN, {
    url: PUT('http://service.clipvnet.com/files/remove'),
    body: {
      files: $var('newfile')
    }
  }, { extends: '#authRequestByToken' })
]
