"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const path = require("path");
const fs = require("fs");
class Utils {
    static getUploadFile(assetPath) {
        return path.join(__dirname, '..', '..', 'assets', assetPath);
    }
    static deleteUploadFiles(files, sizes) {
        if (!files)
            return;
        const remove = (f, sizes) => {
            try {
                fs.statSync(f);
                fs.unlinkSync(f);
            }
            catch (e) { }
            if (sizes) {
                for (let s of sizes) {
                    if (s.ext)
                        remove(f.substr(0, f.lastIndexOf('.') + 1) + s.ext + f.substr(f.lastIndexOf('.')));
                }
            }
        };
        if (!(files instanceof Array))
            return remove(path.join(__dirname, '..', '..', 'assets', files), sizes);
        for (let f of files) {
            remove(path.join(__dirname, '..', '..', 'assets', f), sizes);
        }
    }
}
exports.default = Utils;
//# sourceMappingURL=Utils.js.map