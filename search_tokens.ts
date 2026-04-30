import fs from 'fs';

const data = fs.readFileSync('adk_dump.html', 'utf8');
const text = data.replace(/<[^>]+>/g, ' ');
const words = text.split(/\s+/);

for (const word of words) {
    if (word.match(/^[A-Z]?\d{4,5}$/)) {
        console.log('Possible Token:', word);
    }
}
