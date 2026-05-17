@echo off
echo Building for production...
node node_modules\webpack\bin\webpack.js --mode production
echo Build complete. Output in .\dist\
