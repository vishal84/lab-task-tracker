const fs_constants = require('fs').constants;
const fs = require('fs').promises;
const path = require('path');
const {init} = require('./utils');


async function begin(id, name, eta) {
    if (!id) throw new Error('task id required');

    const TASKS_DIR = await init();
    let task_file = path.join(TASKS_DIR,id);
    let fh = await fs.open(task_file, 'w');
    try {
        await fh.write(`${name || id}|${~~(Date.now() / 1000)}|${eta}\n`);
    } finally {
        await fh.close(fh);
    }

    await update(id, 'started');
}

async function update(id, state) {
    if (!id) throw new Error('task id required');
    if (!state) throw new Error('task state required');

    const TASKS_DIR = await init();
    let task_file = path.join(TASKS_DIR, id);
    let fh = await fs.open(task_file, 'a+');
    try {
        await fh.write(`${state}|${~~(Date.now() / 1000)}\n`);
    } finally {
        await fh.close(fh);
    }
}

async function end(id, state) {
    if (!id) throw new Error('task id required');

    const TASKS_DIR = await init();

    let task_file = path.join(TASKS_DIR,id);
    let fh = await fs.open(task_file, 'a+');
    try {
        await fh.write(`-${state}|${~~(Date.now() / 1000)}\n`);
    } finally {
        await fh.close(fh);
    }
}


async function fail(id, state) {
    if (!id) throw new Error('task id required');

    const TASKS_DIR = await init();

    let task_file = path.join(TASKS_DIR,id);
    let fh = await fs.open(task_file, 'a+');
    try {
        await fh.write(`!${state}|${~~(Date.now() / 1000)}\n`);
    } finally {
        await fh.close(fh);
    }
}

async function del(id) {
    if (!id) throw new Error('task id required');

    const TASKS_DIR = await init();

    let task_file = path.join(TASKS_DIR,id);
    try {
        await fs.unlink(task_file);
    } catch(ex) {
        if (ex.code === 'ENOENT') {
            return true;
        }
        throw ex;
    }
}

async function list() {
    const TASKS_DIR = await init();
    const dir = await fs.opendir(TASKS_DIR);
    for await (const dirent of dir) {
        console.log(dirent.name);
    }
}


module.exports.begin = begin;
module.exports.update = update;
module.exports.end = end;
module.exports.del = del;
module.exports.list = list;
module.exports.fail = fail;