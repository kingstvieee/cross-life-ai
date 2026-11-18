// Internal iPhone QA must not embed the Watch app signed with an App Store profile.
// Preserve the Watch target for production and non-iPhone-only builds.
module.exports = ({ config }) => {
  if (process.env.STAAR_IPHONE_ONLY_QA === '1') {
    return {
      ...config,
      plugins: (config.plugins || []).filter(plugin =>
        (Array.isArray(plugin) ? plugin[0] : plugin) !== '@bacons/apple-targets'),
    };
  }
  return config;
};
