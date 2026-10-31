import * as fs from 'fs';

export function readJson(fileName: string) {
  return JSON.parse(fs.readFileSync('data/' + fileName, 'utf-8'));
}

export function writeJson(fileName: string, data: unknown) {
  fs.writeFileSync('data/' + fileName, JSON.stringify(data, null, 2), 'utf-8');
}

/**
 * Reads a data file once and indexes its rows by a name column (for example the language), so a test finds the expected
 * data of a language by its name and not by its position in the file. Two rows with the same name stop the test at once;
 * get() of a name that has no row throws an error that names the file.
 */
export function readJsonByName(fileName: string, key: string) {
  const byName = new Map<string, any>();
  for (const row of readJson(fileName)) {
    if (byName.has(row[key])) {
      throw new Error("Two rows for " + row[key] + " in " + fileName);
    }
    byName.set(row[key], row);
  }
  return {
    get(name: string) {
      const row = byName.get(name);
      if (!row) {
        throw new Error("No row for " + name + " in " + fileName);
      }
      return row;
    },
  };
}
