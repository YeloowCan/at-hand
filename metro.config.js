const { getDefaultConfig } = require("expo/metro-config");
const { withNativeWind } = require("nativewind/metro");

const config = getDefaultConfig(__dirname);

// 1. 将 wasm 添加为资源扩展名
config.resolver.assetExts.push("wasm");

module.exports = withNativeWind(config, {
  input: "./global.css",
});
