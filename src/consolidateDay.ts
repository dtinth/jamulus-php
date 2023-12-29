import { Duplex, Readable } from "stream";
import { pipeline } from "stream/promises";
import * as fs from "fs";
import * as zlib from "zlib";

export async function consolidateDay(inputFolder: string, outputFile: string) {
  const files = fs
    .readdirSync(inputFolder)
    .sort()
    .filter((x) => x.endsWith(".json.gz"));

  const output = fs.createWriteStream(outputFile);
  const br = zlib.createBrotliCompress({
    params: {
      [zlib.constants.BROTLI_PARAM_QUALITY]: zlib.constants.BROTLI_MAX_QUALITY,
      [zlib.constants.BROTLI_PARAM_MODE]: zlib.constants.BROTLI_MODE_TEXT,
    },
  });

  let rows = 0;
  let totalIn = 0;
  let totalProcessed = 0;
  let totalOut = 0;
  await pipeline(
    Readable.from(files, { objectMode: true }),
    Duplex.from(async function* (source) {
      let i = 0;
      for await (const file of source) {
        const path = `${inputFolder}/${file}`;
        const input = fs.readFileSync(path);
        totalIn += input.length;
        const gunzipped = zlib.gunzipSync(input);
        const json = JSON.parse(gunzipped.toString());
        for (const item of json) {
          rows++;
          const output = Buffer.from(JSON.stringify(item) + "\n");
          totalProcessed += output.length;
          yield output;
        }
        console.log(
          file,
          `[${++i}/${files.length}]`,
          `${totalIn} -> ${totalProcessed} -> ${totalOut}`
        );
      }
    }),
    br,
    Duplex.from(async function* (source) {
      for await (const chunk of source) {
        totalOut += chunk.length;
        yield chunk;
      }
    }),
    output
  );

  console.log(`finished. ${totalIn} -> ${totalProcessed} -> ${totalOut}`);
  return rows;
}
