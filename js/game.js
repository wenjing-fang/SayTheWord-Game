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
  let flipBtn = null;
  let wordInfo = null;
  let isShowingMeaning = false;
  let originalButtonText = "";
  let startWordProcess = null;
  let endCurrentProcess = null;
  let stopVolumeMonitoring = null;
  let startVolumeMonitoring = null;

  function init(config) {
    languageData = config.languageData;
    wordDiv = config.wordDiv;
    messageDiv = config.messageDiv;
    wordActions = config.wordActions;
    sayItBtn = config.sayItBtn;
    flipBtn = config.flipBtn;
    wordInfo = config.wordInfo;
    startWordProcess = config.startWordProcess;
    endCurrentProcess = config.endCurrentProcess;
    stopVolumeMonitoring = config.stopVolumeMonitoring;
    startVolumeMonitoring = config.startVolumeMonitoring;
    currentLang = config.currentLang || "fr";
    words = languageData[currentLang].words || [];
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
  function toggleWordInfo() {
    const lang = languageData[currentLang];
    const wordData = getCurrentWordData();
    
    if (!isShowingMeaning) {
      // Show meaning in button
      if (wordData.meaning) {
        // Clean HTML tags from meaning
        const cleanMeaning = wordData.meaning.replace(/<[^>]*>/g, '').trim();
        originalButtonText = flipBtn.textContent;
        flipBtn.textContent = cleanMeaning;
        isShowingMeaning = true;
      }
    } else {
      // Hide meaning, show button text again
      flipBtn.textContent = originalButtonText || (lang.flipBtnShow || "See Meaning");
      isShowingMeaning = false;
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
      return;
    }
    
    const wordData = getCurrentWordData();
    
    // Display word with pinyin for Chinese
    if (currentLang === 'zh' && languageData.zh.pinyin && languageData.zh.pinyin[wordData.word]) {
      const pinyin = languageData.zh.pinyin[wordData.word];
      wordDiv.innerHTML = `<div style="font-size: 1em; margin-bottom: 8px;">${wordData.word}</div><div style="font-size: 0.5em; color: #4a7c59; font-weight: 400; letter-spacing: 0.5px;">${pinyin}</div>`;
    } else {
      wordDiv.textContent = wordData.word;
    }
    
    // Reset meaning button state for new word
    isShowingMeaning = false;
    wordInfo.style.display = "none";
    flipBtn.textContent = lang.flipBtnShow || "See Meaning";
    sayItBtn.textContent = lang.sayItBtn || "Say It";
    
    // Show action buttons
    wordActions.style.display = "flex";
    
    // Show meaning button only if word has a meaning
    if (wordData.meaning && wordData.meaning.trim()) {
      flipBtn.style.display = "block";
    } else {
      flipBtn.style.display = "none";
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
    incrementIndex
  };
})();

