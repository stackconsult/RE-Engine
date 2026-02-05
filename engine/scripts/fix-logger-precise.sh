#!/bin/bash

# Fix logger API usage - more precise pattern matching
echo "Fixing logger API usage with precise patterns..."

# Pattern 1: logger.info({obj}, "message") -> logger.info("message", {obj})
find src -name "*.ts" -exec sed -i '' 's/logger\.info(\({[^}]*}\), \("[^"]*"\))/logger.info(\2, \1)/g' {} \;

# Pattern 2: logger.error({obj}, "message") -> logger.error("message", {obj})
find src -name "*.ts" -exec sed -i '' 's/logger\.error(\({[^}]*}\), \("[^"]*"\))/logger.error(\2, \1)/g' {} \;

# Pattern 3: logger.warn({obj}, "message") -> logger.warn("message", {obj})
find src -name "*.ts" -exec sed -i '' 's/logger\.warn(\({[^}]*}\), \("[^"]*"\))/logger.warn(\2, \1)/g' {} \;

# Pattern 4: logger.debug({obj}, "message") -> logger.debug("message", {obj})
find src -name "*.ts" -exec sed -i '' 's/logger\.debug(\({[^}]*}\), \("[^"]*"\))/logger.debug(\2, \1)/g' {} \;

# Pattern 5: logger.fatal({obj}, "message") -> logger.fatal("message", {obj})
find src -name "*.ts" -exec sed -i '' 's/logger\.fatal(\({[^}]*}\), \("[^"]*"\))/logger.fatal(\2, \1)/g' {} \;

echo "Logger API fixes completed!"
