"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
class QueueHandler {
    constructor(fcGetObject, fcReleaseObject, timeout = 5000) {
        this.fcGetObject = fcGetObject;
        this.fcReleaseObject = fcReleaseObject;
        this.timeout = timeout;
        this.queues = [];
    }
    get size() {
        return this.queues.length;
    }
    release(item) {
        this.queues.push(item.autoclose(true));
    }
    async get() {
        if (this.queues.length === 0) {
            const item = await this.fcGetObject();
            item.autoclose = (isAutoClose) => {
                if (!isAutoClose) {
                    clearTimeout(item.tm);
                }
                else {
                    item.tm = setTimeout(async () => {
                        await this.fcReleaseObject(item);
                        this.queues.splice(this.queues.indexOf(item), 1);
                    }, this.timeout);
                }
                return item;
            };
            return item;
        }
        return this.queues.pop().autoclose(false);
    }
}
exports.QueueHandler = QueueHandler;
