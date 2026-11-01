// The app shares its music logic (theory, voicings, rhythms, audio) with the web site in ../src/lib, and the
// link catalog in ../resources/links.json, so Metro needs to watch those folders too.
// Packages still come only from mobile/node_modules.
const path = require('path')
const { getDefaultConfig } = require('expo/metro-config')

const config = getDefaultConfig(__dirname)
config.watchFolders = [path.resolve(__dirname, '../src/lib'), path.resolve(__dirname, '../resources')]
config.resolver.nodeModulesPaths = [path.resolve(__dirname, 'node_modules')]

module.exports = config
