// The app shares its music logic (theory, voicings, rhythms, audio) with the web site in ../src/lib,
// so Metro needs to watch that folder too. Packages still come only from mobile/node_modules.
const path = require('path')
const { getDefaultConfig } = require('expo/metro-config')

const config = getDefaultConfig(__dirname)
config.watchFolders = [path.resolve(__dirname, '../src/lib')]
config.resolver.nodeModulesPaths = [path.resolve(__dirname, 'node_modules')]

module.exports = config
