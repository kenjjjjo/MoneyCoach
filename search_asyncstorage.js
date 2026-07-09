const fs = require('fs');
const path = require('path');

function searchInDir(dir, query, extFilter) {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const fullPath = path.join(dir, file);
    const stat = fs.statSync(fullPath);
    if (stat.isDirectory()) {
      if (file !== 'node_modules' && file !== '.expo') {
        searchInDir(fullPath, query, extFilter);
      }
    } else if (extFilter.includes(path.extname(file))) {
      const content = fs.readFileSync(fullPath, 'utf8');
      if (content.includes(query)) {
        console.log(`Found in: ${fullPath}`);
        const lines = content.split('\n');
        lines.forEach((line, i) => {
          if (line.includes(query)) {
            console.log(`  ${i + 1}: ${line.trim()}`);
          }
        });
      }
    }
  }
}

searchInDir('app', 'AsyncStorage', ['.ts', '.tsx']);
searchInDir('lib', 'AsyncStorage', ['.ts', '.tsx']);
searchInDir('components', 'AsyncStorage', ['.ts', '.tsx']);
