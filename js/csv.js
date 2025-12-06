// ============================
// CSV LOADING
// ============================

const CSVLoader = (function() {
  // Store file references from selected folder
  const csvFileMap = new Map(); // filename -> File object
  
  // Simple CSV parser that handles quoted fields
  function parseCSVLine(line) {
    const result = [];
    let current = '';
    let inQuotes = false;
    
    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      const nextChar = line[i + 1];
      
      if (char === '"') {
        if (inQuotes && nextChar === '"') {
          // Escaped quote
          current += '"';
          i++; // Skip next quote
        } else {
          // Toggle quote state
          inQuotes = !inQuotes;
        }
      } else if (char === ',' && !inQuotes) {
        // End of field
        result.push(current.trim());
        current = '';
      } else {
        current += char;
      }
    }
    // Add last field
    result.push(current.trim());
    return result;
  }
  
  async function loadWordsFromCSV(filenameOrFile, languageData, currentLang, messageDiv) {
    try {
      if (!filenameOrFile) {
        console.warn("No CSV filename or file provided");
        return [];
      }
      
      let text;
      
      // Check if it's a File object (from folder selection) or a filename (from config)
      if (filenameOrFile instanceof File) {
        // Read from File object
        text = await filenameOrFile.text();
      } else {
        // Read from URL/filename
        const response = await fetch(filenameOrFile);
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        text = await response.text();
      }
      
      const lines = text.split(/\r?\n/).filter(line => line.trim() !== "");
      
      // Parse CSV: format is #,单词,音标,解释,笔记
      const parsedWords = [];
      
      for (let i = 0; i < lines.length; i++) {
        const line = lines[i].trim();
        
        // Skip header row (starts with #)
        if (i === 0 && line.startsWith('#')) {
          continue;
        }
        
        // Skip empty lines
        if (!line) continue;
        
        const fields = parseCSVLine(line);
        
        // Expected format: index, word, phonetic, meaning, notes
        // We use: 单词 (index 1), 音标 (index 2), 解释 (index 3)
        if (fields.length >= 4) {
          const word = fields[1] || '';
          const phonetic = fields[2] || '';
          const meaning = fields[3] || '';
          
          // Only add if we have a word
          if (word) {
            parsedWords.push({
              word: word,
              phonetic: phonetic || null,
              meaning: meaning || null
            });
          }
        }
      }
      
      languageData.fr.words = parsedWords;
      
      const fileName = filenameOrFile instanceof File ? filenameOrFile.name : filenameOrFile;
      console.log(`Loaded ${parsedWords.length} French words from CSV: ${fileName}`);
      return parsedWords;
    } catch (error) {
      console.error(`Error loading words from CSV:`, error);
      if (messageDiv) {
        const fileName = filenameOrFile instanceof File ? filenameOrFile.name : filenameOrFile;
        messageDiv.textContent = `Erreur lors du chargement de ${fileName}. Vérifiez que le fichier est présent.`;
        messageDiv.style.color = "#e57373";
      }
      return [];
    }
  }
  
  // Automatically detect CSV files from vocabulary folder
  async function detectVocabularyFiles(csvFileSelect, csvMessage) {
    try {
      // Method 1: Try to load manifest.json (optional - if it exists, use it)
      const manifestUrl = 'vocabulary/manifest.json';
      try {
        const response = await fetch(manifestUrl);
        if (response.ok) {
          const manifest = await response.json();
          if (manifest.files && Array.isArray(manifest.files)) {
            const csvFiles = manifest.files.filter(f => f.toLowerCase().endsWith('.csv'));
            
            if (csvFiles.length > 0) {
              // Verify files actually exist
              const existingFiles = await verifyFilesExist(csvFiles);
              if (existingFiles.length > 0) {
                populateCSVDropdown(csvFileSelect, existingFiles);
                csvMessage.textContent = `${existingFiles.length} fichier(s) CSV trouvé(s) dans le dossier vocabulaire.`;
                csvMessage.style.color = "#4caf50";
                return;
              }
            }
          }
        }
      } catch (manifestError) {
        // Manifest not found or invalid - continue to auto-detection
        console.log('Manifest file not found or invalid, using auto-detection...');
      }
      
      // Method 2: Auto-detect from config.js (primary method)
      // This is the main way - just add files to config.js and they'll be auto-detected
      if (typeof AppConfig !== 'undefined' && AppConfig.csvFiles && AppConfig.csvFiles.length > 0) {
        const configFiles = AppConfig.csvFiles.map(f => f.filename);
        const existingFiles = await verifyFilesExist(configFiles);
        
        if (existingFiles.length > 0) {
          populateCSVDropdown(csvFileSelect, existingFiles);
          csvMessage.textContent = `${existingFiles.length} fichier(s) CSV trouvé(s) dans le dossier vocabulaire.`;
          csvMessage.style.color = "#4caf50";
          return;
        }
      }
      
      // If no files found, show message
      csvMessage.textContent = "Aucun fichier CSV trouvé dans le dossier vocabulaire. Ajoutez des fichiers CSV dans le dossier 'vocabulary' et mettez à jour config.js.";
      csvMessage.style.color = "#e57373";
    } catch (error) {
      console.error('Error detecting vocabulary files:', error);
      csvMessage.textContent = "Erreur lors de la détection des fichiers CSV.";
      csvMessage.style.color = "#e57373";
    }
  }
  
  // Helper function to verify which files actually exist
  async function verifyFilesExist(filenames) {
    const existingFiles = [];
    const checkPromises = filenames.map(async (filename) => {
      try {
        const testUrl = `vocabulary/${filename}`;
        const testResponse = await fetch(testUrl, { method: 'HEAD' });
        if (testResponse.ok) {
          return filename;
        }
      } catch (e) {
        // File doesn't exist, return null
        return null;
      }
      return null;
    });
    
    const results = await Promise.all(checkPromises);
    return results.filter(f => f !== null);
  }
  
  // Populate CSV dropdown with file names
  function populateCSVDropdown(csvFileSelect, filenames) {
    // Clear existing options (except the first placeholder)
    while (csvFileSelect.options.length > 1) {
      csvFileSelect.remove(1);
    }
    
    // Sort filenames alphabetically
    filenames.sort();
    
    // Add options
    filenames.forEach(filename => {
      const option = document.createElement('option');
      option.value = filename;
      // Remove .csv extension for display
      const displayName = filename.replace(/\.csv$/i, '');
      option.textContent = displayName;
      csvFileSelect.appendChild(option);
    });
    
    // Show load button if there are files
    const loadCsvBtn = document.getElementById("loadCsvBtn");
    if (loadCsvBtn && filenames.length > 0) {
      loadCsvBtn.style.display = "block";
    }
  }
  
  // Get file reference by filename
  function getFileReference(filename) {
    return csvFileMap.get(filename) || null;
  }

  return {
    loadWordsFromCSV,
    detectVocabularyFiles,
    getFileReference
  };
})();

