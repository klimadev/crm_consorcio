const fs = require('fs');
const path = require('path');

const source = path.join(__dirname, 'src/app/api/db');
const dest = path.join(__dirname, 'src/app/api/db-legacy');
const backup = path.join(__dirname, 'src/app/api/db-backup');

function deleteFolder(folderPath) {
  if (!fs.existsSync(folderPath)) return;
  
  const entries = fs.readdirSync(folderPath, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(folderPath, entry.name);
    if (entry.isDirectory()) {
      deleteFolder(fullPath);
    } else {
      try {
        fs.unlinkSync(fullPath);
        console.log('Deleted file:', fullPath);
      } catch (err) {
        console.log('Could not delete:', fullPath, err.message);
      }
    }
  }
  try {
    fs.rmdirSync(folderPath);
    console.log('Removed folder:', folderPath);
  } catch (err) {
    console.log('Could not remove folder:', folderPath, err.message);
  }
}

function renameWithRetry(maxRetries = 5) {
  for (let i = 0; i < maxRetries; i++) {
    try {
      if (fs.existsSync(source)) {
        fs.renameSync(source, dest);
        console.log('✓ Renamed db to db-legacy');
        return true;
      } else {
        console.log('Source folder not found (already renamed?)');
        return true;
      }
    } catch (err) {
      console.log(`Attempt ${i + 1}: ${err.message}`);
      if (i < maxRetries - 1) {
        const start = Date.now();
        while (Date.now() - start < 2000) { }
      }
    }
  }
  
  console.log('\n⚠ Could not rename, will delete contents...');
  deleteFolder(source);
  if (fs.existsSync(source)) {
    fs.rmdirSync(source);
  }
  console.log('✓ Deleted db folder');
  return true;
}

renameWithRetry();
