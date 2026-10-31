// app.json holds the configuration. This file only adds the web base path when the app is exported
// for a sub-folder, such as the demo site on GitHub Pages (EXPO_BASE_URL=/ninja-antwerp-demo/app).
module.exports = ({ config }) => ({
  ...config,
  experiments: {
    ...config.experiments,
    ...(process.env.EXPO_BASE_URL ? { baseUrl: process.env.EXPO_BASE_URL } : {}),
  },
});
