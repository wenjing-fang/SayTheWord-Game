// ============================
// 法语助手 API INTEGRATION
// ============================

const API = (function() {
  // Save token callback (will be set by main.js)
  let saveTokenCallback = null;
  
  function setSaveTokenCallback(callback) {
    saveTokenCallback = callback;
  }
  
  async function fetchVocabularyLists(language = "fr", apiBaseUrl) {
    const token = document.getElementById("apiToken").value.trim();
    if (!token) {
      document.getElementById("apiMessage").textContent = "Please enter API Token";
      document.getElementById("apiMessage").style.color = "#e57373";
      return;
    }
    
    // Save token when successfully used
    if (saveTokenCallback) {
      saveTokenCallback(token);
    }
    
    const apiMessage = document.getElementById("apiMessage");
    apiMessage.textContent = "Fetching vocabulary lists...";
    apiMessage.style.color = "#4a7c59";
    
    try {
      const url = `${apiBaseUrl}/studylist/category?language=${language}`;
      const response = await fetch(url, {
        method: "GET",
        headers: {
          "User-Agent": "Mozilla/5.0",
          "Authorization": token.startsWith("NIS ") ? token : `NIS ${token}`
        }
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      
      if (data.data && Array.isArray(data.data)) {
        const select = document.getElementById("vocabListSelect");
        select.innerHTML = '<option value="">Select vocabulary list...</option>';
        
        // Fetch word count for each vocabulary list
        const vocabLists = data.data;
        const vocabListPromises = vocabLists.map(async (category) => {
          try {
            // Quick check to get word count (fetch first page only)
            const checkUrl = `${apiBaseUrl}/studylist/words?language=${language}&category_id=${category.id}&page=1&page_size=1`;
            const checkResponse = await fetch(checkUrl, {
              method: "GET",
              headers: {
                "User-Agent": "Mozilla/5.0",
                "Authorization": token.startsWith("NIS ") ? token : `NIS ${token}`
              }
            });
            
            if (checkResponse.ok) {
              const checkData = await checkResponse.json();
              // If we get at least 1 word, the list has words
              // We can't get exact count without fetching all, but we can indicate if it has words
              const hasWords = checkData.data && Array.isArray(checkData.data) && checkData.data.length > 0;
              return { ...category, hasWords };
            }
          } catch (error) {
            console.warn(`Could not check word count for ${category.name}:`, error);
          }
          return { ...category, hasWords: null }; // Unknown
        });
        
        // Wait for all checks to complete
        const vocabListsWithInfo = await Promise.all(vocabListPromises);
        
        vocabListsWithInfo.forEach(category => {
          const option = document.createElement("option");
          option.value = category.id;
          let displayName = category.name;
          if (category.hasWords === true) {
            displayName += " ✓";
          } else if (category.hasWords === false) {
            displayName += " (empty)";
          }
          option.textContent = displayName;
          select.appendChild(option);
        });
        
        select.style.display = "block";
        document.getElementById("loadVocabBtn").style.display = "block";
        apiMessage.textContent = `Found ${data.data.length} vocabulary lists (✓ = has words, empty = no words)`;
        apiMessage.style.color = "#4caf50";
      } else {
        throw new Error(data.message || "No vocabulary lists found");
      }
    } catch (error) {
      console.error("Error fetching vocabulary lists:", error);
      apiMessage.textContent = `Error: ${error.message}`;
      apiMessage.style.color = "#e57373";
    }
  }
  
  async function loadWordsFromVocabularyList(apiBaseUrl, languageData, updateLanguage, endCurrentProcess, messageDiv, wordDiv, stopVolumeMonitoring) {
    const token = document.getElementById("apiToken").value.trim();
    const categoryId = document.getElementById("vocabListSelect").value;
    
    if (!token) {
      document.getElementById("apiMessage").textContent = "Please enter API Token";
      document.getElementById("apiMessage").style.color = "#e57373";
      return;
    }
    
    // Save token when successfully used
    if (saveTokenCallback) {
      saveTokenCallback(token);
    }
    
    if (!categoryId) {
      document.getElementById("apiMessage").textContent = "Please select a vocabulary list";
      document.getElementById("apiMessage").style.color = "#e57373";
      return;
    }
    
    const apiMessage = document.getElementById("apiMessage");
    apiMessage.textContent = "Loading words...";
    apiMessage.style.color = "#4a7c59";
    
    try {
      let allWords = [];
      let page = 1;
      const pageSize = 100;
      let hasMore = true;
      
      while (hasMore) {
        // Ensure category_id is properly formatted (some APIs expect string, some number)
        const url = `${apiBaseUrl}/studylist/words?language=fr&category_id=${encodeURIComponent(categoryId)}&page=${page}&page_size=${pageSize}`;
        console.log(`Fetching words from URL: ${url}`);
        const response = await fetch(url, {
          method: "GET",
          headers: {
            "User-Agent": "Mozilla/5.0",
            "Authorization": token.startsWith("NIS ") ? token : `NIS ${token}`
          }
        });
        
        if (!response.ok) {
          const errorText = await response.text();
          console.error(`HTTP error! status: ${response.status}`);
          console.error("Error response:", errorText);
          throw new Error(`HTTP error! status: ${response.status}, response: ${errorText}`);
        }
        
        // Get response text first to see what we're actually getting
        const responseText = await response.text();
        console.log("Raw API Response Text:", responseText);
        console.log("Response length:", responseText.length);
        
        // Try to parse as JSON
        let data;
        try {
          data = JSON.parse(responseText);
        } catch (parseError) {
          console.error("Failed to parse JSON:", parseError);
          console.error("Response text was:", responseText);
          throw new Error(`Failed to parse API response as JSON: ${parseError.message}`);
        }
        
        // Debug: log the response to see what we're getting
        console.log("Parsed API Response:", data);
        console.log("Data.data:", data.data);
        console.log("Data.data type:", typeof data.data);
        console.log("Is array?", Array.isArray(data.data));
        
        // Check if response has message (might indicate error or empty)
        if (data.message) {
          console.log("API message:", data.message);
        }
        
        // Check if data exists at all
        if (!data) {
          console.error("API returned null or undefined data");
          throw new Error("API returned empty response");
        }
        
        if (data.data && Array.isArray(data.data)) {
          const pageWords = data.data
            .filter(item => item && item.word) // Filter out any invalid items
            .map(item => ({
              word: item.word,
              phonetic: item.phon || null,
              meaning: item.exp || null
            }));
          
          console.log(`Page ${page}: Found ${pageWords.length} words (after filtering)`);
          console.log("Sample words:", pageWords.slice(0, 3));
          
          allWords = allWords.concat(pageWords);
          
          // Check if there are more pages
          // If we got fewer words than pageSize, we're done
          if (data.data.length < pageSize) {
            hasMore = false;
            console.log("No more pages (got fewer words than pageSize)");
          } else {
            page++;
            console.log(`Moving to page ${page}`);
          }
        } else if (data.data === null || data.data === undefined) {
          // API might return null/undefined for empty lists
          console.log("API returned null/undefined for data.data - treating as empty");
          hasMore = false;
        } else {
          // Log what we actually got
          console.warn("Unexpected response structure:", data);
          console.warn("Data.data value:", data.data);
          hasMore = false;
        }
      }
      
      console.log(`Total words loaded: ${allWords.length}`);
      console.log("All words sample:", allWords.slice(0, 5));
      
      if (allWords.length === 0) {
        apiMessage.textContent = "No words in vocabulary list. Please check: 1) If the list is empty 2) Browser console for details";
        apiMessage.style.color = "#e57373";
        console.warn("No words found. Possible reasons:");
        console.warn("1. The vocabulary list is actually empty");
        console.warn("2. The API response structure is different than expected");
        console.warn("3. All words were filtered out (missing 'word' field)");
        console.warn("Check the console logs above for the actual API response.");
        return;
      }
      
      // Update words for French language
      languageData.fr.words = allWords;
      
      // End current process if running
      endCurrentProcess();
      
      // Update UI
      updateLanguage("fr");
      messageDiv.textContent = `Loaded ${allWords.length} words. Click "Start" to begin!`;
      messageDiv.style.color = "#4caf50";
      wordDiv.textContent = "";
      document.getElementById("passBtn").style.display = "none";
      stopVolumeMonitoring();
      
      apiMessage.textContent = `Successfully loaded ${allWords.length} words`;
      apiMessage.style.color = "#4caf50";
      
      return allWords;
    } catch (error) {
      console.error("Error loading words from vocabulary list:", error);
      apiMessage.textContent = `Error: ${error.message}`;
      apiMessage.style.color = "#e57373";
      return [];
    }
  }

  return {
    fetchVocabularyLists,
    loadWordsFromVocabularyList,
    setSaveTokenCallback
  };
})();

