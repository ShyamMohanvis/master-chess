const fs = require('fs');
const path = require('path');
function walk(dir) {
  let results = [];
  const list = fs.readdirSync(dir);
  list.forEach(file => {
    file = path.join(dir, file);
    const stat = fs.statSync(file);
    if (stat && stat.isDirectory()) { 
      results = results.concat(walk(file));
    } else if (file.endsWith('.ts')) {
      results.push(file);
    }
  });
  return results;
}

const files = walk('./src');
files.forEach(f => {
  let content = fs.readFileSync(f, 'utf-8');
  let changed = false;
  
  // If it imports MoveFlags, separate it out
  if (content.includes('MoveFlags')) {
    const old = content;
    content = content.replace(/import\s+{([^}]*MoveFlags[^}]*)}\s+from\s+["']([^"']+)["'];?/g, (match, p1, p2) => {
      const parts = p1.split(',').map(s => s.trim()).filter(s => s);
      const types = parts.filter(s => s !== 'MoveFlags');
      let out = `import { MoveFlags } from "${p2}";\n`;
      if (types.length > 0) {
        out += `import type { ${types.join(', ')} } from "${p2}";\n`;
      }
      return out;
    });
    if (old !== content) changed = true;
  }
  
  // Replace all other imports from *Types that don't have MoveFlags
  const old2 = content;
  content = content.replace(/import\s+{([^}]+)}\s+from\s+["']([^"']*Types)["'];?/g, (match, p1, p2) => {
    return `import type { ${p1} } from "${p2}";`;
  });
  if (old2 !== content) changed = true;
  
  if (changed) {
    fs.writeFileSync(f, content);
    console.log('Fixed', f);
  }
});
