# SayTheWord-Game
This is a word pronunciation game for language learner.

## Adding Vocabulary Files

To add new CSV vocabulary files:

1. **Add your CSV file** to the `vocabulary/` folder
2. **Run the manifest generator** to automatically detect all CSV files:
   ```bash
   node generate-manifest.js
   ```

That's it! The app will automatically detect all CSV files in the vocabulary folder. No need to manually update any code files.

The script scans the `vocabulary/` folder and automatically generates `vocabulary/manifest.json` with all CSV files found.
