module.exports = {
  apps: [{
    name: "hinos-mail-service",
    script: "./.build/index.js",
    watch: false,
    node_args: "",
    env: {
      NODE_ENV: "production"
    }
  }]
}