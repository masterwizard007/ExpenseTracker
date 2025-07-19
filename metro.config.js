const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// Enable the experimental require.context feature
config.transformer.unstable_allowRequireContext = true;

// Set the app root for expo-router
process.env.EXPO_ROUTER_APP_ROOT = './app';

module.exports = config;