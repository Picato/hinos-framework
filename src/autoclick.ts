import * as robot from "robotjs";
import { SyncData } from './service/SyncDataStartup';

// Speed up the mouse.
robot.setMouseDelay(2);
robot.setKeyboardDelay(2);

const screenSize = robot.getScreenSize();
const width = screenSize.width;
const height = screenSize.height;

export async function scan(times: Array<number[]>) {
    setInterval(async () => {
        const d = new Date();
        if (times.find(e => e[0] === d.getHours() && e[1] === d.getMinutes()) && d.getSeconds() === 0) {
            console.log(`Scan at ${d.toUTCString()}`);
            await doNow();
        }
    }, 1000);
}

async function doNow() {
    // Open app
    robot.moveMouse(30, 30);
    robot.mouseClick('left', true);

    setTimeout(function () {
        // Click may cham chong
        robot.moveMouse(width / 2 - 280, height / 2 - 320);
        robot.mouseClick();
        setTimeout(function () {
            // Click tai du lieu cham cong
            robot.moveMouse(width / 2 - 410, height / 2 - 260);
            robot.mouseClick();

            setTimeout(function () {
                // Click duyet tu may cham cong
                robot.moveMouse(width / 2 - 100, height / 2 - 100);
                robot.mouseClick();

                setTimeout(async () => {
                    await SyncData.autoSyncSqlToMongo();
                    robot.moveMouse(width / 2 + 485, height / 2 - 355);
                    robot.mouseClick();
                }, 30000);
            }, 8000);
        }, 1500);
    }, 8000);
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