"use strict"
exports.__esModule = true
var path = require("path")
var resolveApp = function (relativePath) { return path.resolve(__dirname, relativePath) }
module.exports = {
    resolveApp: resolveApp
}
