const fs = require('fs');
const path = require('path');
const CleanCSS = require('clean-css');
const { minify } = require('terser');

const rootDir = path.join(__dirname, '..');

async function minifyFile(relativeFilePath, type) {
    const filePath = path.join(rootDir, relativeFilePath);
    if (!fs.existsSync(filePath)) {
        console.warn(`File not found: ${relativeFilePath}`);
        return;
    }

    const originalContent = fs.readFileSync(filePath, 'utf8');
    const originalSize = Buffer.byteLength(originalContent, 'utf8');
    console.log(`Minifying ${relativeFilePath} (Original: ${(originalSize / 1024).toFixed(2)} KB)...`);

    try {
        let minifiedContent = '';
        if (type === 'css') {
            const cleanCssResult = new CleanCSS({ level: 1 }).minify(originalContent);
            if (cleanCssResult.errors.length > 0) {
                throw new Error(cleanCssResult.errors.join(', '));
            }
            minifiedContent = cleanCssResult.styles;
        } else if (type === 'js') {
            const terserResult = await minify(originalContent, {
                compress: {
                    dead_code: true,
                    drop_debugger: true,
                    conditionals: true,
                    evaluate: true,
                    booleans: true,
                    loops: true,
                    unused: true,
                    hoist_funs: true,
                    keep_fargs: false,
                    join_vars: true
                },
                mangle: {
                    toplevel: false // safe for global-scoped functions in script.js loaded by other scripts/HTML inline
                }
            });
            minifiedContent = terserResult.code;
        }

        const minSize = Buffer.byteLength(minifiedContent, 'utf8');
        const savings = originalSize - minSize;
        const savingsPercent = ((savings / originalSize) * 100).toFixed(1);

        fs.writeFileSync(filePath, minifiedContent, 'utf8');
        console.log(`Successfully minified ${relativeFilePath}!`);
        console.log(`  New Size: ${(minSize / 1024).toFixed(2)} KB (Saved: ${(savings / 1024).toFixed(2)} KB, ${savingsPercent}%)`);
    } catch (err) {
        console.error(`Error minifying ${relativeFilePath}:`, err);
        process.exit(1);
    }
}

async function main() {
    await minifyFile('style.css', 'css');
    await minifyFile('script.js', 'js');
    await minifyFile('main_cms_controller.js', 'js');
    console.log('All files minified successfully.');
}

main();
