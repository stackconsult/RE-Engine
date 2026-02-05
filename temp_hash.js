const bcrypt = require('bcrypt');

const keys = {
  ENGINE_API_KEY: process.argv[2],
  BROWSER_API_KEY: process.argv[3],
  TINYFISH_API_KEY: process.argv[4],
  LLAMA_API_KEY: process.argv[5],
  CORE_API_KEY: process.argv[6],
  OUTREACH_API_KEY: process.argv[7]
};

async function generateHashes() {
  for (const [key, value] of Object.entries(keys)) {
    const hash = await bcrypt.hash(value, 12);
    console.log(`${key}_HASH=\${hash}`);
  }
}

generateHashes().catch(console.error);
