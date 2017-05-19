module.exports = {
  apps: [{
    name: "hinos-framework",
    script: "./.build/index.js",
    watch: false,
    node_args: "--harmony-async-await",
    env: {
      NODE_ENV: "production"
    }
  }]
}