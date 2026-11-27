// metro.config.js
const path = require('path');
const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// @stripe/stripe-react-native n'a pas de build web et importe des modules
// natifs (codegenNativeComponent). On le remplace par un module vide côté web —
// App.js garde déjà un garde runtime (Platform.OS !== 'web').
const defaultResolveRequest = config.resolver.resolveRequest;
config.resolver.resolveRequest = (context, moduleName, platform) => {
  if (platform === 'web' && moduleName.startsWith('@stripe/stripe-react-native')) {
    return { type: 'empty' };
  }
  const resolver = defaultResolveRequest || context.resolveRequest;
  return resolver(context, moduleName, platform);
};

module.exports = config;
