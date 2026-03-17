const fs = require('fs');
const path = require('path');

function walk(dir) {
    let results = [];
    const list = fs.readdirSync(dir);
    list.forEach(function(file) {
        if (file === 'node_modules' || file === '.git' || file === '.antigravityignore') return;
        file = path.join(dir, file);
        const stat = fs.statSync(file);
        if (stat && stat.isDirectory()) { 
            results = results.concat(walk(file));
        } else { 
            if (file.endsWith('.js') || file.endsWith('.jsx')) {
                results.push(file);
            }
        }
    });
    return results;
}

const files = walk('./src');
let changed = 0;

files.forEach(file => {
    const content = fs.readFileSync(file, 'utf8');
    if (content.includes('sessionStorage')) {
        const newContent = content.replace(/sessionStorage/g, 'localStorage');
        fs.writeFileSync(file, newContent, 'utf8');
        changed++;
        console.log(`Updated ${file}`);
    }
});

console.log(`Total files changed: ${changed}`);
