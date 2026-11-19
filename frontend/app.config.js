// The internal iPhone preview excludes the Watch target so Ad Hoc export
// cannot accidentally use an App Store Watch provisioning profile.
// Production builds retain the Watch target unchanged.
module.exports = ({ config }) => process.env.STAAR_IPHONE_ONLY_QA === '1'
  ? { ...config, plugins: (config.plugins || []).filter(plugin =>
      (Array.isArray(plugin) ? plugin[0] : plugin) !== '@bacons/apple-targets') }
  : config;
