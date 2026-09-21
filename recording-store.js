const fs = require('node:fs/promises');
const path = require('node:path');
const { randomUUID } = require('node:crypto');

function createRecordingStore(directory) {
  return {
    async save(bytes) {
      const data = Buffer.from(bytes);
      if (data.length <= 44 || data.length > 20 * 1024 * 1024 || data.toString('ascii', 0, 4) !== 'RIFF' || data.toString('ascii', 8, 12) !== 'WAVE') {
        throw new Error('Invalid or empty WAV recording (maximum 20 MB).');
      }
      await fs.mkdir(directory, { recursive: true });
      const id = randomUUID();
      await fs.writeFile(path.join(directory, id + '.wav'), data, { flag: 'wx' });
      return { id };
    },
    async read(id) {
      if (typeof id !== 'string' || !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/.test(id)) throw new Error('Invalid recording ID.');
      return new Uint8Array(await fs.readFile(path.join(directory, id + '.wav')));
    },
  };
}
module.exports = { createRecordingStore };
