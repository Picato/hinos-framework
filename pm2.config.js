module.exports = {
  apps: [{
    name: "hinos-framework",
    script: "./.build/index.js",
    watch: false,
    node_args: "",
    env: {
      NODE_ENV: "production"
    }
  }]
}