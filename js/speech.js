// ============================
// SPEECH RECOGNITION
// ============================

const SpeechRecognitionManager = (function() {
  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  let recognition = null;
  let lastProcessedIndex = -1;
  let getLanguageData = null;
  let getCurrentLang = null;
  let messageDiv = null;
  let getCurrentWordIndex = null;
  let onSuccess = null;
  let playSuccessSound = null;

  function init(config) {
    getLanguageData = config.getLanguageData;
    getCurrentLang = config.getCurrentLang;
    messageDiv = config.messageDiv;
    getCurrentWordIndex = config.getCurrentWordIndex;
    onSuccess = config.onSuccess;
    playSuccessSound = config.playSuccessSound;
  }

  // Normalize text for comparison (remove extra spaces, punctuation)
  function normalizeText(text, currentLang) {
    let normalized = text.toLowerCase().trim();
    
    // Remove punctuation (works for both French and Chinese)
    normalized = normalized.replace(/[.,!?;:，。！？；：]/g, '');
    
    // For Chinese, remove all spaces. For French, normalize spaces.
    if (currentLang === 'zh') {
      normalized = normalized.replace(/\s+/g, '');
    } else {
      normalized = normalized.replace(/\s+/g, ' ').trim();
    }
    
    return normalized;
  }

  // End current recognition process
  function endCurrentProcess() {
    if (recognition) {
      if (recognition.state === 'listening' || recognition.state === 'starting') {
        recognition.stop();
      }
      recognition = null; // Clear the instance
    }
    lastProcessedIndex = -1; // Reset tracking
    // Clear any process-related messages
    if (messageDiv) {
      messageDiv.textContent = "";
    }
  }
  
  // Start a new word process with a fresh recognition instance
  function startWordProcess(targetWord) {
    // End any existing process first
    endCurrentProcess();
    
    // Capture the current word index for this process
    const currentWordIndex = getCurrentWordIndex();
    const currentLang = getCurrentLang();
    
    // Create new recognition instance for this word
    recognition = new SpeechRecognition();
    recognition.lang = getLanguageData().code;
    recognition.interimResults = true;
    recognition.continuous = true;
    
    // Set up event handlers for this instance
    recognition.onresult = (event) => {
      // Ignore results if this process is for a different word (process was ended)
      if (getCurrentWordIndex() !== currentWordIndex || !recognition) {
        return;
      }
      
      const resultIndex = event.results.length - 1;
      const transcript = normalizeText(event.results[resultIndex][0].transcript, currentLang);
      const isFinal = event.results[resultIndex].isFinal;
      const target = normalizeText(targetWord, currentLang);

      const lang = getLanguageData();

      // Skip if we've already processed this result
      if (resultIndex <= lastProcessedIndex) {
        return;
      }
      
      // Ignore empty or very short transcripts (likely old/empty results)
      if (!transcript || transcript.trim().length === 0) {
        return;
      }

      // Check for correct match in interim or final results
      if (transcript === target) {
        lastProcessedIndex = resultIndex;
        
        // Show success message (part of current process)
        messageDiv.textContent = lang.great;
        messageDiv.style.color = "#4caf50";
        if (playSuccessSound) {
          playSuccessSound();
        }
        
        // Wait a moment to show the success message, then end process
        setTimeout(() => {
          if (onSuccess) {
            onSuccess();
          }
        }, 800);
      } else if (isFinal) {
        // Only show error message for final (confirmed) incorrect results
        lastProcessedIndex = resultIndex;
        const originalTranscript = event.results[resultIndex][0].transcript.trim();
        messageDiv.textContent = `${lang.youSaid} "${originalTranscript}". ${lang.tryAgain}`;
        messageDiv.style.color = "#e57373";
      }
    };

    recognition.onend = () => {
      // Process ended - don't auto-restart, we'll start new process manually
    };
    
    // Start the recognition for this word
    recognition.start();
  }
  
  // Initialize recognition (for language switching)
  function setupRecognition() {
    endCurrentProcess();
    // Don't start here - will start when word is shown
  }

  return {
    init,
    endCurrentProcess,
    startWordProcess,
    setupRecognition,
    normalizeText
  };
})();

