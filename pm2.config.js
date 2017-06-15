module.exports = {
  apps: [{
    name: "blaz",
    script: "./.build/index.js",
    watch: false,
    node_args: "--harmony-async-await",
    env: {
      NODE_ENV: "production"
    }
  }]
}