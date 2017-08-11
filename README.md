# hinos-framework
Quickstart project which is integrated by hinos + typescript + hinos plugins to fast build and it's optimize to increase performance and flexible for large projects

# Features
1. Auto gen code (controller, service, router) base on file config
2. It's integrated by hinos-plugins which provides many utilities to make the api building to be so easy
3. It always be updated the lastest typescript and nodejs version
4. You can write your plugins by yourself and integrate into project

# How to use
### Installation
```sh
npm run once //Install global library
npm install //Install app library
```
### Generate code
1. Go to ```./gen_code```
2. ```npm install```
3. Declare your tables (collection) in mongo at ```./gen_code/src/config.ts```
4. Please run ``` npm run gen ``` to auto generate code
5. After done, please check files: 
    1. ./src/controller/```${YourTable}```Controller.ts ` ==> Declare API path`
    2. ./src/service/```${YourTable}```Service.ts ` ==> Handle business`
    3. ./http/```${YourTable}```.http ` ==> Quick test API via json`
    4. ./src/test/spec/```${YourTable}```.spec.ts ` ==> Test base on mocha framework`
### Configuration
1. Declare your application config in `./package.json` field `config`
2. After done, you can get its value in `AppConfig.${your config}`
__Remember__: declare it also in `./typings/globals/index.d.ts`

### Build
1. For production: `npm run build` ` ==> After build done, it'll finish`
2. For development: `npm run dev` ` ==> It build then watch. And auto also rebuild file when got changes`

### Start server
2. Start by npm `npm start`
3. Start by pm2 `npm run pm2`

# Prerequisite
If you nodejs verision < 8.0 then you need add bellow code in package.json
```json
"scripts": {
    "start": "node --harmony-async-await .",
}
```
In that: 
* --harmony-async-await is flag which allow nodejs support async await
