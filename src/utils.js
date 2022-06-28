const { format:formatDate, addSeconds } = require('date-fns');
const fs = require('fs').promises;
const fs_constants = require('fs').constants;
const os = require('os');
const path = require('path');

const TASKS_DIR = path.join(os.tmpdir(), 'lab-tasks');

async function init() {
    let path = TASKS_DIR ;
    if (await exists(path)) {
        return TASKS_DIR;
    }

    let umask = process.umask(0);
    try {
        await fs.mkdir(path, {recursive: true, mode: 0o777});
        return TASKS_DIR;
    } finally {
        //restore umask
        process.umask(umask);
    }
}

async function exists(path) {
    try {
        await fs.access(path, fs_constants.F_OK);
        return true;
    } catch(ex) {
        if (ex.code === 'ENOENT') {
            return false;
        }
        throw ex;
    }
}


module.exports = {
    init,
}