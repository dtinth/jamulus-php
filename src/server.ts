import Fastify from "fastify";
import { getAllServers } from "./getAllServers";

const fastify = Fastify({ logger: true });

fastify.get("/", async function handler(request, reply) {
  return {
    data: await getAllServers(),
  };
});

await fastify.listen({ port: +process.env.PORT! || 3000 });
