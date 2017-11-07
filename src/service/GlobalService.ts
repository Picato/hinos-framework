import Utils from '../common/Utils'
import HttpError from '../common/HttpError'
import { TableService } from './TableService'
import { DynamicService } from './DynamicService'

export class GlobalService {

  static async export({ projectId }) {
    try {
      await Utils.executeCmd(`mongodump -d dynamic -c Table -q "{'project_id': ObjectId('${projectId}') }" -o "${Utils.getTempPath(projectId.toString())}"`)

      const tbls = await TableService.find({ project_id: projectId, recordsPerPage: 0 })
      for (const tbl of tbls) {
        await Utils.executeCmd(`mongodump -d dynamic -c ${DynamicService.getTableDynamic(projectId, tbl.name)} -o "${Utils.getTempPath(projectId.toString())}"`)
      }

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
