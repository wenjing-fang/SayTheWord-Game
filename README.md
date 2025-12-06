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

## Deploying to GitHub Pages

The app is ready to deploy to GitHub Pages! All file paths are configured to work both locally and on GitHub Pages.

### Steps to deploy:

1. **Push your code to GitHub** (make sure the `vocabulary/` folder and all CSV files are included)
2. **Go to your repository settings** → Pages
3. **Select the branch** (usually `main` or `master`) and folder (usually `/root`)
4. **Save** - GitHub Pages will deploy your site

The CSV files will load automatically from the `vocabulary/` folder on GitHub Pages, just like they do locally.

**Important**: Make sure to run `node generate-manifest.js` and commit the updated `vocabulary/manifest.json` file before deploying, so the app knows which CSV files are available.
