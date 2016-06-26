'use strict'

const co = require('co')
const path = require('path')
const fs = require('fs')
const exec = require('co-exec')

class MicroserviceCache {
  constructor(cacheDir) {
    this.cacheDir = cacheDir || path.join(process.env.HOME, '.stitch')
  }

  getCodebase(serviceName, repoUrl) {
    const self = this
    return co(function* getCodebaseImpl() {
      yield self.makeCacheDir()

      const serviceDir = path.join(self.cacheDir, serviceName)
      const isServiceDirExists = yield isDir(serviceDir)

      if (!isServiceDirExists) {
        const gitCloneCommand = `git clone ${repoUrl} ${serviceName}`
        yield exec(gitCloneCommand, { cwd: self.cacheDir })
      } else {
        yield exec('git pull', { cwd: serviceDir })
      }

      return serviceDir
    })
  }

  // private
  makeCacheDir() {
    const self = this
    return co(function* makeCacheDirImpl() {
      const cacheDirExists = yield isDir(self.cacheDir)
      if (!cacheDirExists) {
        yield fs.mkdir.bind(fs, self.cacheDir)
      }
    })
  }
}

function isDir(dirPath) {
  return co(function* isDirImpl() {
    try {
      const dirStats = yield fs.stat.bind(fs, dirPath)
      return dirStats.isDirectory()
    } catch (err) {
      return false
    }
  })
}

module.exports = MicroserviceCache
