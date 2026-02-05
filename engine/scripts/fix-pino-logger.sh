#!/bin/bash

# Fix Pino logger usage - Pino expects logger.info(obj, message)
echo "Fixing Pino logger usage - swapping to correct Pino format..."

# Pattern 1: logger.info("message", {obj}) -> logger.info({obj}, "message")
find src -name "*.ts" -exec sed -i '' 's/logger\.info(\("[^"]*"\), \({[^}]*}\))/logger.info(\2, \1)/g' {} \;

# Pattern 2: logger.error("message", {obj}) -> logger.error({obj}, "message")
find src -name "*.ts" -exec sed -i '' 's/logger\.error(\("[^"]*"\), \({[^}]*}\))/logger.error(\2, \1)/g' {} \;

# Pattern 3: logger.warn("message", {obj}) -> logger.warn({obj}, "message")
find src -name "*.ts" -exec sed -i '' 's/logger\.warn(\("[^"]*"\), \({[^}]*}\))/logger.warn(\2, \1)/g' {} \;

# Pattern 4: logger.debug("message", {obj}) -> logger.debug({obj}, "message")
find src -name "*.ts" -exec sed -i '' 's/logger\.debug(\("[^"]*"\), \({[^}]*}\))/logger.debug(\2, \1)/g' {} \;

# Pattern 5: logger.fatal("message", {obj}) -> logger.fatal({obj}, "message")
find src -name "*.ts" -exec sed -i '' 's/logger\.fatal(\("[^"]*"\), \({[^}]*}\))/logger.fatal(\2, \1)/g' {} \;

echo "Pino logger fixes completed!"
