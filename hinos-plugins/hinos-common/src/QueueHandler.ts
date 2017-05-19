export class QueueHandler<T extends { autoclose?: Function, tm?: any }> {
    queues: Array<T> = [];
    constructor(private fcGetObject: () => T | Promise<T>, private fcReleaseObject: (item: T) => any | Promise<any>, private timeout: number = 5000) {

    }
    public get size() {
        return this.queues.length;
    }
    public release(item: T) {
        this.queues.push(item.autoclose(true));
    }
    public async get(): Promise<T> {
        if (this.queues.length === 0) {
            const item: T = await this.fcGetObject();
            item.autoclose = (isAutoClose): T => {
                if (!isAutoClose) {
                    clearTimeout(item.tm);
                } else {
                    item.tm = setTimeout(async () => {
                        await this.fcReleaseObject(item);
                        this.queues.splice(this.queues.indexOf(item), 1);
                    }, this.timeout);
                }
                return item;
            }
            return item;
        }
        return this.queues.pop().autoclose(false);
    }
}