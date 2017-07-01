module.exports = {
  apps: [{
    name: "hinos-file-service",
    script: "./.build/index.js",
    watch: false,
    node_args: "",
    env: {
      NODE_ENV: "production"
    }
  }]
}