# api-testing
Quick test and re-use variable in the progress test APIs

# Features
1. Test REST APIs
2. Re-use variable after each testcase done
3. Split a big testcase to many smaller testcases which make easy testing for large project
4. Easy to extends for specific project

# How to use
### Installation
1. install "Project Snippets" plugins in visual code to make testcase easier
2. install librarries
```sh
npm run once //Install global library
npm install //Install app library
```

### Quick command
- ```api${METHOD}``` to create a call api template
- ```doc${METHOD}``` to create a call doc template
- ```apidelay``` to create a call delay template
- ```apiinclude``` to create a include a part.ts file
- ```varget``` to get value of variable
- ```vargetbody``` to get value of response body
- ```vargetheaders``` to get value of response headers

### Write testcase
- All of testcases must be save in src/doc

### Global files
- src/common.ts: Config global variables which used in all of testcases
- src/i18doc.ts: Config global message for doc features
- src/i18ignore.ts: Config fields which be ignored when export to doc
 + $headers: map to response headers
 + $body: map to response body
 + headers: map to request headers
 + body: map to request body
 + *: map to all

### Run
```sh
npm start 
```
