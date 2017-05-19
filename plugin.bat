rmdir /s /q "node_modules/hinos-common"
rmdir /s /q "node_modules/hinos"
rmdir /s /q "node_modules/hinos-serve"
rmdir /s /q "node_modules/hinos-compression"
rmdir /s /q "node_modules/hinos-route"
rmdir /s /q "node_modules/hinos-bodyparser"
rmdir /s /q "node_modules/hinos-requestmatcher"
rmdir /s /q "node_modules/hinos-mongo"
rmdir /s /q "node_modules/hinos-redis"
rmdir /s /q "node_modules/hinos-rabbitmq"
rmdir /s /q "node_modules/hinos-socketio"
rmdir /s /q "node_modules/hinos-validation"
cd hinos-plugins
cd ./hinos-common
@start /b /w cmd /c npm run build
cd ../hinos
@start /b /w cmd /c npm run build
cd ../hinos-route
@start /b /w cmd /c npm run build
cd ../hinos-serve
@start /b /w cmd /c npm run build
cd ../hinos-compression
@start /b /w cmd /c npm run build
cd ../hinos-bodyparser
@start /b /w cmd /c npm run build
cd ../hinos-requestmatcher
@start /b /w cmd /c npm run build
cd ../hinos-mongo
@start /b /w cmd /c npm run build
cd ../hinos-validation
@start /b /w cmd /c npm run build
cd ../hinos-rabbitmq
@start /b /w cmd /c npm run build
cd ../hinos-redis
@start /b /w cmd /c npm run build
cd ../hinos-socketio
@start /b /w cmd /c npm run build
cd ../../
npm install