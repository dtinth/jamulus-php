import { Env } from "@(-.-)/env";
import { z } from "zod";
import * as Minio from "minio";
import { mkdirSync } from "fs";
import { execa } from "execa";
import { consolidateDay } from "../consolidateDay";

const env = Env(
  z.object({
    STORAGE_ENDPOINT: z.string(),
    STORAGE_BUCKET: z.string(),
    STORAGE_AK: z.string(),
    STORAGE_SK: z.string(),
    STORAGE_NS: z.string(),
  })
);

process.env.AWS_ACCESS_KEY_ID = env.STORAGE_AK;
process.env.AWS_SECRET_ACCESS_KEY = env.STORAGE_SK;

const client = new Minio.Client({
  endPoint: env.STORAGE_ENDPOINT,
  useSSL: true,
  accessKey: env.STORAGE_AK,
  secretKey: env.STORAGE_SK,
});

const today = new Date().toISOString().slice(0, 10);
const startDate = new Date(Date.now() - 7 * 86400e3).toISOString().slice(0, 10);

for (
  let date = startDate;
  date < today;
  date = new Date(Date.parse(date + "T00:00:00Z") + 86400e3)
    .toISOString()
    .slice(0, 10)
) {
  const month = date.slice(0, 7);
  const targetFile = `${env.STORAGE_NS}/daily/${month}/${date}.ndjson.br`;

  // Check if the file exists
  const exists = await client
    .statObject(env.STORAGE_BUCKET, targetFile)
    .then(() => true)
    .catch((e) => {
      if (e.code === "NotFound") {
        return false;
      }
      throw e;
    });
  if (exists) {
    console.log(`Already exists - ${targetFile}`);
    continue;
  }

  console.log(`Consolidating ${date}...`);

  const rawDataPrefix = `${env.STORAGE_NS}/${date.replace(/-/g, "/")}/`;
  const rawDataPath = `data.local/raw/${date}/`;
  mkdirSync(rawDataPath, { recursive: true });

  // Use s3cmd to download the files
  await execa(
    "s3cmd",
    [
      `--host=https://${env.STORAGE_ENDPOINT}`,
      `--host-bucket=https://%(bucket)s.${env.STORAGE_ENDPOINT}`,
      "sync",
      `s3://${env.STORAGE_BUCKET}/${rawDataPrefix}`,
      rawDataPath,
      "-P",
    ],
    { stdio: "inherit" }
  );

  const consolidatedPath = `data.local/consolidated/${date}.ndjson.br`;
  mkdirSync("data.local/consolidated", { recursive: true });
  const rowsProcessed = await consolidateDay(rawDataPath, consolidatedPath);

  if (rowsProcessed === 0) {
    console.log(`No data for ${date}`);
    continue;
  }

  // Upload the consolidated file
  await client.fPutObject(env.STORAGE_BUCKET, targetFile, consolidatedPath, {
    "x-amz-acl": "public-read",
    "content-type": "application/x-ndjson; charset=utf-8",
    "content-encoding": "br",
  });
  console.log(`Uploaded - ${targetFile}`);
}
