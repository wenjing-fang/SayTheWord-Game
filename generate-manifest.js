#!/usr/bin/env node

/**
 * Auto-generate manifest.json from CSV files in vocabulary folder
 * Run this script after adding new CSV files to automatically update the manifest
 * 
 * Usage: node generate-manifest.js
 */

const fs = require('fs');
const path = require('path');

const vocabularyDir = path.join(__dirname, 'vocabulary');
const manifestPath = path.join(vocabularyDir, 'manifest.json');

try {
  // Read all files in vocabulary directory
  const files = fs.readdirSync(vocabularyDir);
  
  // Filter for CSV files only
  const csvFiles = files.filter(file => 
    file.toLowerCase().endsWith('.csv') && 
    file !== 'manifest.json' // Exclude manifest itself
  );
  
  // Sort alphabetically
  csvFiles.sort();
  
  // Create manifest object
  const manifest = {
    files: csvFiles
  };
  
  // Write manifest.json
  fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2) + '\n', 'utf8');
  
  console.log(`✓ Manifest generated successfully!`);
  console.log(`  Found ${csvFiles.length} CSV file(s):`);
  csvFiles.forEach(file => console.log(`    - ${file}`));
  console.log(`\n  Manifest saved to: ${manifestPath}`);
  
} catch (error) {
  if (error.code === 'ENOENT') {
    console.error(`Error: Vocabulary directory not found at ${vocabularyDir}`);
    console.error('Please create the vocabulary folder first.');
  } else {
    console.error('Error generating manifest:', error.message);
  }
  process.exit(1);
}

