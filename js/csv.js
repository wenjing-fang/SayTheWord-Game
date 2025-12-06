// ============================
// CSV LOADING
// ============================

const CSVLoader = (function() {
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
  
  async function loadWordsFromCSV(filename, languageData, currentLang, messageDiv) {
    try {
      if (!filename) {
        console.warn("No CSV filename provided");
        return [];
      }
      
      const response = await fetch(filename);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const text = await response.text();
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
      
      console.log(`Loaded ${parsedWords.length} French words from CSV: ${filename}`);
      return parsedWords;
    } catch (error) {
      console.error(`Error loading words from CSV (${filename}):`, error);
      if (messageDiv) {
        messageDiv.textContent = `Erreur lors du chargement de ${filename}. Vérifiez que le fichier est présent.`;
        messageDiv.style.color = "#e57373";
      }
      return [];
    }
  }

  return {
    loadWordsFromCSV
  };
})();

