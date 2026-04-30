import fs from 'fs';

const data = fs.readFileSync('chunk.js', 'utf8');
const urls = data.match(/https?:\/\/[^\s"'<>]+/g) || [];
const uniqueUrls = Array.from(new Set(urls));
console.log(uniqueUrls.join('\n'));
