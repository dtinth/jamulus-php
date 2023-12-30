import Fastify from "fastify";
import { getAllServers } from "./getAllServers";
import { Env } from "@(-.-)/env";
import { z } from "zod";
import { uuidv7 } from "uuidv7";
import * as Minio from "minio";
import * as zlib from "zlib";

const fastify = Fastify({ logger: true });
const env = Env(
  z.object({
    API_KEY: z.string(),
    STORAGE_ENDPOINT: z.string(),
    STORAGE_BUCKET: z.string(),
    STORAGE_AK: z.string(),
    STORAGE_SK: z.string(),
    STORAGE_NS: z.string(),
    WORKER_NAME: z.string().default("unknown"),
  })
);

fastify.get("/", async function handler(request, reply) {
  if (request.headers["x-api-key"] !== env.API_KEY) {
    reply.status(401).send("Unauthorized");
    return;
  }

  return {
    result: await getAllServers(env.WORKER_NAME),
  };
});

fastify.post("/upload", async function handler(request, reply) {
  if (request.headers["x-api-key"] !== env.API_KEY) {
    reply.status(401).send("Unauthorized");
    return;
  }

  const id = uuidv7();
  const date = new Date().toISOString().slice(0, 10).replace(/-/g, "/");
  const key = `${env.STORAGE_NS}/${date}/${id}.json.gz`;
  const result = await getAllServers(env.WORKER_NAME);
  const data = JSON.stringify(result);
  const buffer = Buffer.from(data, "utf-8");
  const compressed = zlib.gzipSync(buffer, { level: 9 });
  const client = new Minio.Client({
    endPoint: env.STORAGE_ENDPOINT,
    useSSL: true,
    accessKey: env.STORAGE_AK,
    secretKey: env.STORAGE_SK,
  });
  await client.putObject(env.STORAGE_BUCKET, key, compressed, {
    "x-amz-acl": "public-read",
    "content-type": "application/json; charset=utf-8",
    "content-encoding": "gzip",
  });

  const info = {
    key: key,
    size: compressed.length,
    uncompressedSize: buffer.length,
    stats: result.map((x) => ({
      time: x.time,
      genre: x.genre,
      count: x.list.length,
    })),
    history: [] as any[],
  };

  // Get latest.json
  try {
    const latest = await client
      .getObject(env.STORAGE_BUCKET, `${env.STORAGE_NS}/latest.json`)
      .then((stream) => stream.toArray())
      .then((buffers) => Buffer.concat(buffers).toString("utf-8"))
      .then((text) => JSON.parse(text));
    const previousHistory = latest.history || [];
    delete latest.history;
    info.history = [latest, ...previousHistory].slice(0, 20);
  } catch (err) {
    console.error("Unable to process latest data", err);
  }

  await client.putObject(
    env.STORAGE_BUCKET,
    `${env.STORAGE_NS}/latest.json`,
    Buffer.from(JSON.stringify(info), "utf-8"),
    {
      "x-amz-acl": "public-read",
      "content-type": "application/json; charset=utf-8",
    }
  );
  return info;
});

await fastify.listen({ port: +process.env.PORT! || 3000, host: "0.0.0.0" });
