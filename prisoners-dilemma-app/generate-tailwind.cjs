// Script to generate the initial tailwind-output.css file
const { execSync } = require('child_process');

console.log('Generating Tailwind CSS output file...');
try {
  execSync('npx tailwindcss -i ./src/index.css -o ./src/tailwind-output.css');
  console.log('Tailwind CSS output file generated successfully!');
} catch (error) {
  console.error('Error generating Tailwind CSS output file:', error);
  process.exit(1);
}