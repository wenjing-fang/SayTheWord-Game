// ============================
// MAIN INITIALIZATION
// ============================

(function() {
  // Get DOM elements
  const wordDiv = document.getElementById("word");
  const messageDiv = document.getElementById("message");
  const volumeContainer = document.getElementById("volumeContainer");
  const volumeLevel = document.getElementById("volumeLevel");
  const wordActions = document.querySelector(".word-actions");
  const sayItBtn = document.getElementById("sayItBtn");
  const restartRecognitionBtn = document.getElementById("restartRecognitionBtn");
  const flipBtn = document.getElementById("flipBtn");
  const wordInfo = document.getElementById("wordInfo");
  const progressContainer = document.getElementById("progressContainer");
  const progressFill = document.getElementById("progressFill");
  const progressText = document.getElementById("progressText");
  const addTranslationContainer = document.getElementById("addTranslationContainer");
  const addTranslationInput = document.getElementById("addTranslationInput");
  const saveTranslationBtn = document.getElementById("saveTranslationBtn");

  // Initialize modules
  function initModules() {
    // Initialize Audio Manager
    AudioManager.init({
      volumeContainer,
      volumeLevel,
      messageDiv
    }, () => AppConfig.languageData[Game.getCurrentLang()] || AppConfig.languageData.fr);

    // Initialize Speech Recognition
    SpeechRecognitionManager.init({
      getLanguageData: () => AppConfig.languageData[Game.getCurrentLang()],
      getCurrentLang: () => Game.getCurrentLang(),
      messageDiv,
      getCurrentWordIndex: () => Game.getCurrentWordIndex(),
      onSuccess: () => {
        Game.incrementIndex();
        SpeechRecognitionManager.endCurrentProcess();
        Game.showNextWord();
      },
      playSuccessSound: () => AudioManager.playSuccessSound()
    });

    // Initialize Game
    Game.init({
      languageData: AppConfig.languageData,
      wordDiv,
      messageDiv,
      wordActions,
      sayItBtn,
      restartRecognitionBtn,
      flipBtn,
      wordInfo,
      progressContainer,
      progressFill,
      progressText,
      addTranslationContainer,
      addTranslationInput,
      saveTranslationBtn,
      currentLang: "fr",
      startWordProcess: (targetWord) => SpeechRecognitionManager.startWordProcess(targetWord),
      endCurrentProcess: () => SpeechRecognitionManager.endCurrentProcess(),
      stopVolumeMonitoring: () => AudioManager.stopVolumeMonitoring(),
      startVolumeMonitoring: () => AudioManager.startVolumeMonitoring()
    });
  }

  // Update language
  function updateLanguage(lang) {
    Game.updateLanguage(lang);
    
    // Note: CSV words are now loaded manually via the CSV selector
    // No automatic loading on language switch
    
    // Create new recognition instance with new language
    SpeechRecognitionManager.setupRecognition();
    
    // Update UI text
    document.getElementById("title").textContent = AppConfig.languageData[lang].title;
    document.getElementById("startBtn").textContent = AppConfig.languageData[lang].startBtn;
    document.getElementById("passBtn").textContent = AppConfig.languageData[lang].passBtn;
    
    // Update practice section UI
    if (typeof updatePracticeUI === 'function') {
      updatePracticeUI();
    }
    
    // Update CSV section UI
    updateCSVSectionUI();
    
    // Update active button
    document.querySelectorAll(".lang-btn").forEach(btn => {
      btn.classList.toggle("active", btn.dataset.lang === lang);
    });
  }

  // Practice section handler
  function handlePracticeInput() {
    const input = document.getElementById("practiceInput").value.trim();
    const lang = AppConfig.languageData[Game.getCurrentLang()];
    
    if (!input) {
      messageDiv.textContent = lang.practiceError || "Please enter some words to practice.";
        messageDiv.style.color = "#e57373";
      return;
    }
    
    // Parse input: handle tab-separated (word\tphonetic\tmeaning), comma-separated, and newline-separated
    const lines = input.split(/\r?\n/);
    const parsedWords = [];
    
    for (const line of lines) {
      const trimmedLine = line.trim();
      if (!trimmedLine) continue;
      
      // Check if it's tab-separated (word\tphonetic\tmeaning format)
      if (trimmedLine.includes('\t')) {
        const parts = trimmedLine.split('\t').map(p => p.trim());
        if (parts.length >= 1 && parts[0]) {
          const wordObj = {
            word: parts[0],
            phonetic: parts[1] || null,
            meaning: parts[2] || null
          };
          // Also support Chinese column names
          if (parts[0] === '单词' || parts[0] === '音标' || parts[0] === '解释') {
            continue; // Skip header row
          }
          parsedWords.push(wordObj);
        }
      } else {
        // Handle comma-separated or single words
        const wordsInLine = trimmedLine.split(',').map(w => w.trim()).filter(w => w.length > 0);
        parsedWords.push(...wordsInLine);
      }
    }
    
    if (parsedWords.length === 0) {
      messageDiv.textContent = lang.practiceNoWords || "No valid words found. Please check your input.";
        messageDiv.style.color = "#e57373";
      return;
    }
    
    // Update words for current language
    AppConfig.languageData[Game.getCurrentLang()].words = parsedWords;
    Game.setWords(parsedWords);
    
    // End current process if running
    SpeechRecognitionManager.endCurrentProcess();
    
    // Update UI
    messageDiv.textContent = `${parsedWords.length} ${lang.practiceSuccess || "words loaded. Click \"Start\" to begin!"}`;
        messageDiv.style.color = "#4caf50";
    wordDiv.textContent = "";
    document.getElementById("passBtn").style.display = "none";
  }

  // Update practice UI
  window.updatePracticeUI = function() {
    const lang = AppConfig.languageData[Game.getCurrentLang()];
    document.getElementById("practiceInput").placeholder = lang.practicePlaceholder || "Enter words separated by commas or new lines...";
    document.getElementById("practiceBtn").textContent = lang.practiceBtn || "Practice These";
  };

  // API Token management with localStorage
  const TOKEN_STORAGE_KEY = "frdic_api_token";
  
  function loadSavedToken() {
    const savedToken = localStorage.getItem(TOKEN_STORAGE_KEY);
    if (savedToken) {
      const apiTokenInput = document.getElementById("apiToken");
      if (apiTokenInput) {
        apiTokenInput.value = savedToken;
      }
    }
  }
  
  function saveToken(token) {
    if (token && token.trim()) {
      localStorage.setItem(TOKEN_STORAGE_KEY, token.trim());
    } else {
      localStorage.removeItem(TOKEN_STORAGE_KEY);
    }
  }
  
  // Main initialization function
  async function main() {
    // Load saved API token
    loadSavedToken();
    
    // Save token when user types in the input field
    const apiTokenInput = document.getElementById("apiToken");
    if (apiTokenInput) {
      apiTokenInput.addEventListener("input", (e) => {
        saveToken(e.target.value);
      });
      // Also save on blur (when user leaves the field)
      apiTokenInput.addEventListener("blur", (e) => {
        saveToken(e.target.value);
      });
    }
    
    // Initialize all modules
    initModules();
    
    // Automatically detect CSV files from vocabulary folder
    const csvFileSelect = document.getElementById("csvFileSelect");
    const csvMessage = document.getElementById("csvMessage");
    if (csvFileSelect && csvMessage) {
      csvMessage.textContent = "Détection des fichiers CSV...";
      csvMessage.style.color = "#4a7c59";
      await CSVLoader.detectVocabularyFiles(csvFileSelect, csvMessage);
    }
    
    // Set up CSV file loader
    document.getElementById("loadCsvBtn").onclick = async () => {
      const selectedFile = csvFileSelect.value;
      if (!selectedFile) {
        const csvMessage = document.getElementById("csvMessage");
        csvMessage.textContent = "Please select a CSV file";
        csvMessage.style.color = "#e57373";
        return;
      }
      
      const csvMessage = document.getElementById("csvMessage");
      csvMessage.textContent = `Loading ${selectedFile}...`;
      csvMessage.style.color = "#4a7c59";
      
      try {
        // Check if we have a file reference from folder selection
        const fileRef = CSVLoader.getFileReference(selectedFile);
        // If no file reference, assume it's in the vocabulary folder
        // Use path that works both locally and on GitHub Pages
        if (!fileRef) {
          // Get base path using the same logic as CSVLoader
          let pathname = window.location.pathname;
          if (pathname.endsWith('.html') || pathname.endsWith('.htm')) {
            pathname = pathname.substring(0, pathname.lastIndexOf('/') + 1);
          }
          if (!pathname.endsWith('/')) {
            pathname += '/';
          }
          if (pathname === '//') {
            pathname = '/';
          }
          var fileToLoad = `${pathname}vocabulary/${selectedFile}`;
          console.log('Loading CSV file from:', fileToLoad);
        } else {
          var fileToLoad = fileRef;
        }
        
        const words = await CSVLoader.loadWordsFromCSV(fileToLoad, AppConfig.languageData, "fr", messageDiv);
        
        if (words && words.length > 0) {
          Game.setWords(words);
          
          // Switch to French if not already
          if (Game.getCurrentLang() !== "fr") {
            updateLanguage("fr");
          }
          
          // End current process if running
          SpeechRecognitionManager.endCurrentProcess();
          
          // Update UI
          messageDiv.textContent = `Loaded ${words.length} words. Click "Start" to begin!`;
          messageDiv.style.color = "#4caf50";
          wordDiv.textContent = "";
          document.getElementById("passBtn").style.display = "none";
          AudioManager.stopVolumeMonitoring();
          
          csvMessage.textContent = `Successfully loaded ${words.length} words`;
          csvMessage.style.color = "#4caf50";
        } else {
          csvMessage.textContent = "No words found in CSV file";
          csvMessage.style.color = "#e57373";
        }
      } catch (error) {
        csvMessage.textContent = `Loading failed: ${error.message}`;
        csvMessage.style.color = "#e57373";
      }
    };
    
    // Set up language selector buttons
    document.querySelectorAll(".lang-btn").forEach(btn => {
      btn.addEventListener("click", () => {
        updateLanguage(btn.dataset.lang);
      });
    });
    
    // Set up start button
    document.getElementById("startBtn").onclick = () => {
      const lang = AppConfig.languageData[Game.getCurrentLang()];
      if (Game.getWords().length === 0) {
        messageDiv.textContent = lang.noWordsAvailable;
        return;
      }
      Game.startGame();
    };
    
    // Set up pass button
    document.getElementById("passBtn").onclick = () => Game.passCurrentWord();
    
    // Set up word action buttons
    sayItBtn.onclick = () => Game.sayWord();
    if (restartRecognitionBtn) {
      restartRecognitionBtn.onclick = () => Game.restartRecognition();
    }
    flipBtn.onclick = () => Game.toggleWordInfo();
    
    // Set up translation input
    if (saveTranslationBtn) {
      saveTranslationBtn.onclick = () => Game.saveTranslation();
    }
    if (addTranslationInput) {
      addTranslationInput.addEventListener("keypress", (e) => {
        if (e.key === "Enter") {
          Game.saveTranslation();
        }
      });
    }
    
    // Set up token save callback for API
    API.setSaveTokenCallback(saveToken);
    
    // Set up 法语助手 API buttons
    document.getElementById("fetchVocabListsBtn").onclick = () => {
      API.fetchVocabularyLists("fr", AppConfig.API_BASE_URL);
    };
    
    document.getElementById("loadVocabBtn").onclick = () => {
      API.loadWordsFromVocabularyList(
        AppConfig.API_BASE_URL,
        AppConfig.languageData,
        updateLanguage,
        () => SpeechRecognitionManager.endCurrentProcess(),
        messageDiv,
        wordDiv,
        () => AudioManager.stopVolumeMonitoring()
      ).then(words => {
        if (words && words.length > 0) {
          Game.setWords(words);
        }
      });
    };
    
    // Initialize practice UI
    updatePracticeUI();
    
    // Set up practice button
    document.getElementById("practiceBtn").onclick = handlePracticeInput;
    
    // Update CSV section UI with translations
    updateCSVSectionUI();
  }
  
  // Update CSV section UI with current language
  function updateCSVSectionUI() {
    const lang = AppConfig.languageData[Game.getCurrentLang()];
    const csvFileSelect = document.getElementById("csvFileSelect");
    const loadCsvBtn = document.getElementById("loadCsvBtn");
    const csvSectionTitle = document.querySelector("#csvSection h3");
    
    if (csvFileSelect && lang.csvSelectPlaceholder) {
      if (csvFileSelect.options.length > 0) {
        csvFileSelect.options[0].textContent = lang.csvSelectPlaceholder;
      }
    }
    if (loadCsvBtn && lang.loadCsvBtn) {
      loadCsvBtn.textContent = lang.loadCsvBtn;
    }
    if (csvSectionTitle && lang.csvSectionTitle) {
      csvSectionTitle.textContent = lang.csvSectionTitle;
    }
  }
  
  // Run main when DOM is ready
  document.addEventListener('DOMContentLoaded', main);
})();

