const { getDefaultConfig } = require("expo/metro-config");
const path = require("path");

const config = getDefaultConfig(__dirname);

// Permite que o Metro siga symlinks criados pelo npm workspaces
config.resolver.unstable_enableSymlinks = true;

// Adiciona a pasta packages/ ao watchFolders para o Metro recarregar
// quando os arquivos de @mentorias/auth mudarem durante o desenvolvimento
config.watchFolders = [path.resolve(__dirname, "packages")];

module.exports = config;
