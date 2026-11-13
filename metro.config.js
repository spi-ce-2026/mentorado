const { getDefaultConfig } = require("expo/metro-config");
const path = require("path");

const config = getDefaultConfig(__dirname);

// Adiciona a pasta packages/ ao watchFolders para o Metro recarregar
// quando os arquivos de @mentorias/auth mudarem durante o desenvolvimento
config.watchFolders = [path.resolve(__dirname, "packages")];

module.exports = config;
