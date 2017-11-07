import Utils from '../common/Utils'
import HttpError from '../common/HttpError'

export class GlobalService {
  static async export({ projectId }) {
    try {
      await Utils.executeCmd(`mongodump -d mail -c Mail -q "{'project_id': ObjectId('${projectId}') }" -o "${Utils.getTempPath(projectId.toString())}"`)
      await Utils.executeCmd(`mongodump -d mail -c MailConfig -q "{'project_id': ObjectId('${projectId}') }" -o "${Utils.getTempPath(projectId.toString())}"`)
      await Utils.executeCmd(`mongodump -d mail -c MailTemplate -q "{'project_id': ObjectId('${projectId}') }" -o "${Utils.getTempPath(projectId.toString())}"`)
      await Utils.zipFolder(Utils.getTempPath(projectId.toString()), Utils.getTempPath(`${projectId.toString()}.zip`))
      return require('fs').createReadStream(Utils.getTempPath(`${projectId.toString()}.zip`))
    } catch (e) {
      throw HttpError.INTERNAL("Could not export database")
    } finally {
      await Utils.removeFolder(Utils.getTempPath(projectId.toString()))
      setTimeout(async () => {
        await Utils.removeFolder(Utils.getTempPath(`${projectId.toString()}.zip`))
      }, 5 * 60000)
    }
  }
}