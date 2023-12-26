import Fastify from "fastify";
import { getAllServers } from "./getAllServers";

const fastify = Fastify({ logger: true });

fastify.get("/", async function handler(request, reply) {
  const apiKey = process.env.API_KEY;
  if (!apiKey || request.headers["x-api-key"] !== apiKey) {
    reply.status(401).send("Unauthorized");
    return;
  }

  return {
    data: await getAllServers(),
  };
});

await fastify.listen({ port: +process.env.PORT! || 3000 });
