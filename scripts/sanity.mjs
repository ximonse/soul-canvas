import fs from 'node:fs';
import path from 'node:path';

const checklistPath = path.resolve('docs', 'QA_CHECKLIST.md');

console.log('\nSanity checks complete.');
if (fs.existsSync(checklistPath)) {
  console.log('\nQA CHECKLIST:\n');
  console.log(fs.readFileSync(checklistPath, 'utf8'));
} else {
  console.log('Reminder: run through docs/QA_CHECKLIST.md');
}
