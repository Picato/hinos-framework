import * as robot from "robotjs";
import { SyncData } from './service/SyncDataStartup';

// Speed up the mouse.
robot.setMouseDelay(2);
robot.setKeyboardDelay(2);

const screenSize = robot.getScreenSize();
const width = screenSize.width;
const height = screenSize.height;

export async function scan() {
    console.log(`Scan at ${new Date().toUTCString()}`);
    robot.moveMouse(width / 2 - 100, height / 2 - 100);
    robot.mouseClick();
    setTimeout(async () => {
        await SyncData.autoSyncSqlToMongo();
        setTimeout(scan, AppConfig.app.interval);
    }, 10000);
}

const startDate = (dd, MM, yyyy) => {
    let distance = 0;
    let x = width / 2 - 420;
    let y = height / 2 - 150;
    return new Promise((resolve, reject) => {
        let input = (vl, distance) => {
            return new Promise((resolve, reject) => {
                setTimeout(() => {
                    robot.moveMouse(x + distance, y);
                    robot.mouseClick();
                    robot.typeString(vl);
                    distance += 20;
                    resolve();
                }, 200);
            });
        };
        input(dd, 0).then(() => {
            input(MM, 20).then(() => {
                input(yyyy, 40).then(() => {
                    resolve();
                });
            });
        });
    })
}

const endDate = (dd, MM, yyyy) => {
    let distance = 0;
    let x = width / 2 - 420;
    let y = height / 2 - 150 + 30;
    return new Promise((resolve, reject) => {
        let input = (vl, distance) => {
            return new Promise((resolve, reject) => {
                setTimeout(() => {
                    robot.moveMouse(x + distance, y);
                    robot.mouseClick();
                    robot.typeString(vl);
                    distance += 20;
                    resolve();
                }, 500);
            });
        };
        input(dd, 0).then(() => {
            input(MM, 20).then(() => {
                input(yyyy, 40).then(() => {
                    resolve();
                });
            });
        });
    })
}



// startDate(2, 2, 2011).then(() => {
//     endDate(1, 1, 2014).then(() => {
//         scan();
//         console.log('done');
//     });
// })