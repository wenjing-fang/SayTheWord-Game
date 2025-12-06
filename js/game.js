// ============================
// GAME LOGIC
// ============================

const Game = (function() {
  let words = [];
  let index = 0;
  let currentLang = "fr";
  let languageData = null;
  let wordDiv = null;
  let messageDiv = null;
  let wordActions = null;
  let sayItBtn = null;
  let restartRecognitionBtn = null;
  let flipBtn = null;
  let wordInfo = null;
  let isShowingMeaning = false; // Persistent state: true = meanings shown, false = meanings hidden
  let originalButtonText = "";
  let startWordProcess = null;
  let endCurrentProcess = null;
  let stopVolumeMonitoring = null;
  let startVolumeMonitoring = null;
  let progressContainer = null;
  let progressFill = null;
  let progressText = null;
  let addTranslationContainer = null;
  let addTranslationInput = null;
  let saveTranslationBtn = null;

  function init(config) {
    languageData = config.languageData;
    wordDiv = config.wordDiv;
    messageDiv = config.messageDiv;
    wordActions = config.wordActions;
    sayItBtn = config.sayItBtn;
    restartRecognitionBtn = config.restartRecognitionBtn;
    flipBtn = config.flipBtn;
    wordInfo = config.wordInfo;
    startWordProcess = config.startWordProcess;
    endCurrentProcess = config.endCurrentProcess;
    stopVolumeMonitoring = config.stopVolumeMonitoring;
    startVolumeMonitoring = config.startVolumeMonitoring;
    progressContainer = config.progressContainer;
    progressFill = config.progressFill;
    progressText = config.progressText;
    addTranslationContainer = config.addTranslationContainer;
    addTranslationInput = config.addTranslationInput;
    saveTranslationBtn = config.saveTranslationBtn;
    currentLang = config.currentLang || "fr";
    words = languageData[currentLang].words || [];
  }

  function updateProgress() {
    if (!progressContainer || !progressFill || !progressText) return;
    
    if (words.length === 0) {
      progressContainer.style.display = "none";
      return;
    }
    
    const total = words.length;
    const current = index + 1; // Show 1-based position (word 1, 2, 3...)
    const remaining = Math.max(0, total - current); // Words not yet started
    const percentage = total > 0 ? ((index + 1) / total) * 100 : 0;
    
    // Cap percentage at 100%
    const cappedPercentage = Math.min(100, percentage);
    progressFill.style.width = `${cappedPercentage}%`;
    
    const lang = languageData[currentLang];
    const progressTemplate = lang.progressText || "{current} / {total} words ({remaining} remaining)";
    progressText.textContent = progressTemplate
      .replace("{current}", current)
      .replace("{total}", total)
      .replace("{remaining}", remaining);
    
    progressContainer.style.display = "block";
  }

  // Get current word data (handles both string and object format)
  function getCurrentWordData() {
    const wordData = words[index];
    if (typeof wordData === 'string') {
      return { word: wordData, phonetic: null, meaning: null };
    } else if (typeof wordData === 'object' && wordData !== null) {
      return {
        word: wordData.word || wordData.单词 || wordData,
        phonetic: wordData.phonetic || wordData.音标 || null,
        meaning: wordData.meaning || wordData.解释 || null
      };
    }
    return { word: String(wordData), phonetic: null, meaning: null };
  }

  // Say the word using text-to-speech
  function sayWord() {
    const wordData = getCurrentWordData();
    if (!wordData.word) return;
    
    if ('speechSynthesis' in window) {
      // Cancel any ongoing speech
      speechSynthesis.cancel();
      
      const utterance = new SpeechSynthesisUtterance(wordData.word);
      utterance.lang = languageData[currentLang].code;
      utterance.rate = 0.9;
      utterance.pitch = 1.0;
      utterance.volume = 1.0;
      
      // Handle errors
      utterance.onerror = (event) => {
        console.error("Speech synthesis error:", event.error);
        const lang = languageData[currentLang];
        messageDiv.textContent = lang.speechError || "Error playing sound. Please try again.";
        messageDiv.style.color = "#e57373";
      };
      
      // Optional: show feedback when speaking starts
      utterance.onstart = () => {
        sayItBtn.style.opacity = "0.6";
      };
      
      utterance.onend = () => {
        sayItBtn.style.opacity = "1.0";
      };
      
      try {
        speechSynthesis.speak(utterance);
      } catch (error) {
        console.error("Error starting speech synthesis:", error);
        const lang = languageData[currentLang];
        messageDiv.textContent = lang.speechError || "Error playing sound. Please try again.";
        messageDiv.style.color = "#e57373";
      }
    } else {
      // Browser doesn't support speech synthesis
      const lang = languageData[currentLang];
      messageDiv.textContent = lang.speechNotSupported || "Text-to-speech is not supported in your browser.";
      messageDiv.style.color = "#c97d60";
    }
  }
  
  // Toggle word info (meaning only) - button shows meaning when clicked
  // State persists across words
  function toggleWordInfo() {
    const lang = languageData[currentLang];
    const wordData = getCurrentWordData();
    
    // Toggle the persistent state
    isShowingMeaning = !isShowingMeaning;
    
    // Update display based on new state
    if (isShowingMeaning) {
      // Show meaning in button
      if (wordData.meaning) {
        // Clean HTML tags from meaning
        const cleanMeaning = wordData.meaning.replace(/<[^>]*>/g, '').trim();
        originalButtonText = lang.flipBtnShow || "See Meaning";
        flipBtn.textContent = cleanMeaning;
      } else {
        // No meaning available, revert state
        isShowingMeaning = false;
      }
    } else {
      // Hide meaning, show button text again
      flipBtn.textContent = originalButtonText || (lang.flipBtnShow || "See Meaning");
    }
  }
  
  // Update meaning display based on current state (called when word changes)
  function updateMeaningDisplay() {
    const lang = languageData[currentLang];
    const wordData = getCurrentWordData();
    
    if (!flipBtn) return;
    
    // Only update if button should be visible (word has meaning)
    if (wordData.meaning && wordData.meaning.trim()) {
      if (isShowingMeaning) {
        // State is "open", show the meaning
        const cleanMeaning = wordData.meaning.replace(/<[^>]*>/g, '').trim();
        originalButtonText = lang.flipBtnShow || "See Meaning";
        flipBtn.textContent = cleanMeaning;
      } else {
        // State is "closed", show button text
        flipBtn.textContent = originalButtonText || (lang.flipBtnShow || "See Meaning");
      }
    }
  }
  
  function showNextWord() {
    const lang = languageData[currentLang];
    if (words.length === 0) {
      wordDiv.textContent = "—";
      messageDiv.textContent = lang.noWords;
      document.getElementById("passBtn").style.display = "none";
      wordActions.style.display = "none";
      flipBtn.style.display = "none";
      wordInfo.style.display = "none";
      if (progressContainer) {
        progressContainer.style.display = "none";
      }
      if (addTranslationContainer) {
        addTranslationContainer.style.display = "none";
      }
      if (endCurrentProcess) {
        endCurrentProcess();
      }
      return;
    }
    if (index >= words.length) {
      wordDiv.textContent = lang.finished;
      messageDiv.textContent = lang.greatJob;
      messageDiv.style.color = "#4caf50";
      if (endCurrentProcess) {
        endCurrentProcess();
      }
      if (stopVolumeMonitoring) {
        stopVolumeMonitoring();
      }
      document.getElementById("passBtn").style.display = "none";
      wordActions.style.display = "none";
      flipBtn.style.display = "none";
      wordInfo.style.display = "none";
      if (addTranslationContainer) {
        addTranslationContainer.style.display = "none";
      }
      updateProgress(); // Update to show completion
      return;
    }
    
    updateProgress(); // Update progress bar
    
    const wordData = getCurrentWordData();
    
    // Display word with pinyin for Chinese
    if (currentLang === 'zh' && languageData.zh.pinyin && languageData.zh.pinyin[wordData.word]) {
      const pinyin = languageData.zh.pinyin[wordData.word];
      wordDiv.innerHTML = `<div style="font-size: 1em; margin-bottom: 8px;">${wordData.word}</div><div style="font-size: 0.5em; color: #4a7c59; font-weight: 400; letter-spacing: 0.5px;">${pinyin}</div>`;
    } else {
      wordDiv.textContent = wordData.word;
    }
    
    // Don't reset isShowingMeaning - keep persistent state
    wordInfo.style.display = "none";
    sayItBtn.textContent = lang.sayItBtn || "Say It";
    if (restartRecognitionBtn) {
      restartRecognitionBtn.textContent = lang.restartRecognitionBtn || "Restart";
    }
    
    // Show action buttons
    wordActions.style.display = "flex";
    
    // Show meaning button only if word has a meaning
    if (wordData.meaning && wordData.meaning.trim()) {
      flipBtn.style.display = "block";
      if (addTranslationContainer) {
        addTranslationContainer.style.display = "none";
      }
      // Update meaning display based on persistent state
      updateMeaningDisplay();
    } else {
      flipBtn.style.display = "none";
      // Show translation input if word doesn't have a meaning
      if (addTranslationContainer) {
        addTranslationContainer.style.display = "block";
        if (addTranslationInput) {
          addTranslationInput.value = "";
          addTranslationInput.placeholder = lang.addTranslationPlaceholder || "Add translation...";
        }
        if (saveTranslationBtn) {
          saveTranslationBtn.textContent = lang.saveTranslationBtn || "Save";
        }
      }
    }
    
    document.getElementById("passBtn").style.display = "inline-block";
    
    // Start new process for this word (new recognition instance)
    // This will clear old messages and set up fresh recognition
    if (startWordProcess) {
      startWordProcess(wordData.word);
    }
    
    // Set initial message for new process (after process starts)
    messageDiv.textContent = lang.sayPhrase;
    messageDiv.style.color = "#4a7c59";
  }
  
  function passCurrentWord() {
    const lang = languageData[currentLang];
    if (index >= words.length) {
      return;
    }
    
    // Show pass message (part of current process)
    messageDiv.textContent = lang.passed;
      messageDiv.style.color = "#81c784";
    
    // Wait a moment to show the pass message, then end process
    setTimeout(() => {
      index++;
      // End current process (pass means end of process)
      if (endCurrentProcess) {
        endCurrentProcess();
      }
      // Start new process for next word
      showNextWord();
    }, 500);
  }

  function startGame() {
    index = 0;
    if (startVolumeMonitoring) {
      startVolumeMonitoring();
    }
    showNextWord(); // This will start the first word process
  }

  function updateLanguage(lang) {
    currentLang = lang;
    words = languageData[currentLang].words || [];
    index = 0;
    
    // Reset meaning button state
    isShowingMeaning = false;
    originalButtonText = "";
    
    // Reset game state
    wordDiv.textContent = "—";
    messageDiv.textContent = "";
    document.getElementById("passBtn").style.display = "none";
    if (stopVolumeMonitoring) {
      stopVolumeMonitoring();
    }
  }

  function setWords(newWords) {
    words = newWords;
    index = 0;
    updateProgress();
  }

  function getWords() {
    return words;
  }

  function getIndex() {
    return index;
  }

  function setIndex(newIndex) {
    index = newIndex;
  }

  function getCurrentLang() {
    return currentLang;
  }

  function getCurrentWordIndex() {
    return index;
  }

  function incrementIndex() {
    index++;
  }

  function saveTranslation() {
    if (!addTranslationInput) return;
    
    const translation = addTranslationInput.value.trim();
    if (!translation) return;
    
    // Get current word and update it
    const wordData = words[index];
    if (typeof wordData === 'string') {
      // Convert string to object
      words[index] = { word: wordData, phonetic: null, meaning: translation };
    } else if (typeof wordData === 'object' && wordData !== null) {
      // Update existing object
      words[index] = { ...wordData, meaning: translation };
    }
    
    // Hide input and show meaning button
    if (addTranslationContainer) {
      addTranslationContainer.style.display = "none";
    }
    if (flipBtn) {
      flipBtn.style.display = "block";
    }
    
    // Update meaning display based on persistent state
    updateMeaningDisplay();
    
    // Clear input
    if (addTranslationInput) {
      addTranslationInput.value = "";
    }
  }

  function restartRecognition() {
    const lang = languageData[currentLang];
    const wordData = getCurrentWordData();
    
    if (!wordData.word) return;
    
    // End current process
    if (endCurrentProcess) {
      endCurrentProcess();
    }
    
    // Start new process for current word
    if (startWordProcess) {
      startWordProcess(wordData.word);
    }
    
    // Reset message
    messageDiv.textContent = lang.sayPhrase;
    messageDiv.style.color = "#4a7c59";
  }

  return {
    init,
    getCurrentWordData,
    sayWord,
    toggleWordInfo,
    showNextWord,
    passCurrentWord,
    startGame,
    updateLanguage,
    setWords,
    getWords,
    getIndex,
    setIndex,
    getCurrentLang,
    getCurrentWordIndex,
    incrementIndex,
    saveTranslation,
    restartRecognition
  };
})();

