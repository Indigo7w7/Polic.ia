const fs = require('fs');
const path = require('path');

const includeDirs = ['src', 'scripts'];
const includeFiles = ['package.json', 'tsconfig.json'];
const outputFileName = 'contexto_ia.txt';

let contextBuffer = "--- PROYECTO: CADETE PRO - CONTEXTO TÉCNICO ---\n\n";

function readFiles(dir) {
    if (!fs.existsSync(dir)) return;
    const files = fs.readdirSync(dir);
    files.forEach(file => {
        const filePath = path.join(dir, file);
        const stat = fs.statSync(filePath);
        if (stat.isDirectory()) {
            if (!['node_modules', '.git', 'dist', 'build', '.next'].includes(file)) {
                readFiles(filePath);
            }
        } else if (/\.(ts|tsx|js|json)$/.test(file) && !file.endsWith('.d.ts')) {
            const content = fs.readFileSync(filePath, 'utf8');
            contextBuffer += `\n--- FILE: ${filePath} ---\n${content}\n`;
        }
    });
}

console.log("🚀 Iniciando extracción del ADN del proyecto...");

includeFiles.forEach(file => {
    if (fs.existsSync(file)) {
        contextBuffer += `\n--- FILE: ${file} ---\n${fs.readFileSync(file, 'utf8')}\n`;
    }
});

includeDirs.forEach(dir => readFiles(dir));

fs.writeFileSync(outputFileName, contextBuffer);
console.log(`✅ ¡Misión cumplida! Copia el contenido de: ${outputFileName}`);