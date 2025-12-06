// ============================
// AUDIO ANALYSIS & SOUNDS
// ============================

const AudioManager = (function() {
  let audioContext = null;
  let analyser = null;
  let microphone = null;
  let dataArray = null;
  let animationFrameId = null;
  let volumeContainer = null;
  let volumeLevel = null;
  let messageDiv = null;
  let getLanguageData = null;

  function init(elements, languageGetter) {
    volumeContainer = elements.volumeContainer;
    volumeLevel = elements.volumeLevel;
    messageDiv = elements.messageDiv;
    getLanguageData = languageGetter;
  }

  function startVolumeMonitoring() {
    navigator.mediaDevices.getUserMedia({ audio: true })
      .then(stream => {
        audioContext = new (window.AudioContext || window.webkitAudioContext)();
        analyser = audioContext.createAnalyser();
        microphone = audioContext.createMediaStreamSource(stream);
        microphone.connect(analyser);
        
        analyser.fftSize = 256;
        const bufferLength = analyser.frequencyBinCount;
        dataArray = new Uint8Array(bufferLength);
        
        volumeContainer.style.display = "block";
        updateVolumeBar();
      })
      .catch(error => {
        console.error("Error accessing microphone:", error);
        const lang = getLanguageData();
        messageDiv.textContent = lang.micError;
      });
  }
  
  function updateVolumeBar() {
    if (!analyser || !dataArray) return;
    
    analyser.getByteFrequencyData(dataArray);
    
    // Calculate average volume
    let sum = 0;
    for (let i = 0; i < dataArray.length; i++) {
      sum += dataArray[i];
    }
    const average = sum / dataArray.length;
    
    // Convert to percentage (0-100)
    const volumePercent = Math.min(100, (average / 255) * 100);
    volumeLevel.style.width = volumePercent + "%";
    
    animationFrameId = requestAnimationFrame(updateVolumeBar);
  }
  
  function stopVolumeMonitoring() {
    if (animationFrameId) {
      cancelAnimationFrame(animationFrameId);
      animationFrameId = null;
    }
    if (microphone) {
      microphone.disconnect();
      microphone = null;
    }
    if (audioContext) {
      audioContext.close();
      audioContext = null;
    }
    if (volumeContainer) {
      volumeContainer.style.display = "none";
    }
    if (volumeLevel) {
      volumeLevel.style.width = "0%";
    }
  }
  
  function playSuccessSound() {
    try {
      const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
      const oscillator = audioCtx.createOscillator();
      const gainNode = audioCtx.createGain();
      
      oscillator.connect(gainNode);
      gainNode.connect(audioCtx.destination);
      
      // Create a pleasant two-tone chime
      oscillator.frequency.setValueAtTime(523.25, audioCtx.currentTime); // C5
      oscillator.frequency.setValueAtTime(659.25, audioCtx.currentTime + 0.1); // E5
      oscillator.type = 'sine';
      
      gainNode.gain.setValueAtTime(0.3, audioCtx.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.3);
      
      oscillator.start(audioCtx.currentTime);
      oscillator.stop(audioCtx.currentTime + 0.3);
    } catch (error) {
      console.error("Error playing success sound:", error);
    }
  }

  return {
    init,
    startVolumeMonitoring,
    stopVolumeMonitoring,
    playSuccessSound
  };
})();

