#!/bin/bash

# Fix logger API usage throughout the codebase
# Changes logger.method(data, message) to logger.method(message, data)

echo "Fixing logger API usage..."

# Fix logger.info calls
find src -name "*.ts" -exec sed -i '' 's/logger\.info(\([^,]*\), \([^)]*\))/logger.info(\2, \1)/g' {} \;

# Fix logger.error calls  
find src -name "*.ts" -exec sed -i '' 's/logger\.error(\([^,]*\), \([^)]*\))/logger.error(\2, \1)/g' {} \;

# Fix logger.warn calls
find src -name "*.ts" -exec sed -i '' 's/logger\.warn(\([^,]*\), \([^)]*\))/logger.warn(\2, \1)/g' {} \;

# Fix logger.debug calls
find src -name "*.ts" -exec sed -i '' 's/logger\.debug(\([^,]*\), \([^)]*\))/logger.debug(\2, \1)/g' {} \;

# Fix logger.fatal calls
find src -name "*.ts" -exec sed -i '' 's/logger\.fatal(\([^,]*\), \([^)]*\))/logger.fatal(\2, \1)/g' {} \;

echo "Logger API fixes completed!"
