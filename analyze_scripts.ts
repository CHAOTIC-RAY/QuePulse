import fs from 'fs';

const data = fs.readFileSync('adk_dump.html', 'utf8');
const scriptMatch = data.match(/<script[^>]*>([\s\S]*?)<\/script>/g) || [];

for (const script of scriptMatch) {
    if (script.includes('token') || script.includes('queue') || script.includes('serving')) {
        console.log('--- FOUND POTENTIAL SCRIPT ---');
        console.log(script.substring(0, 500) + '...');
    }
}
