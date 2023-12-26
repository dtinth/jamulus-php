import { execa } from "execa";
import pMap from "p-map";

const explorerUrls = {
  "Any Genre 1": "anygenre1.jamulus.io:22124",
  "Any Genre 2": "anygenre2.jamulus.io:22224",
  "Any Genre 3": "anygenre3.jamulus.io:22624",
  "Genre Rock": "rock.jamulus.io:22424",
  "Genre Jazz": "jazz.jamulus.io:22324",
  "Genre Classical/Folk": "classical.jamulus.io:22524",
  "Genre Choral/Barbershop": "choral.jamulus.io:22724",
};

export async function fetchServer(directory: string) {
  const result = await execa("php", ["servers.php", `directory=${directory}`], {
    timeout: 10000,
  });
  try {
    return JSON.parse(result.stdout);
  } catch (e) {
    console.error(
      `Unable to parse JSON output when parsing directory [local]: ${directory}`
    );
    console.error(`Received output: ${JSON.stringify(result.stdout)}`);
    throw e;
  }
}

export async function fetchFromRemote(directory: string) {
  const response = await fetch(
    "https://explorer.jamulus.io/servers-sf.php?directory=" +
      encodeURIComponent(directory)
  );
  const text = await response.text();
  try {
    return JSON.parse(text);
  } catch (e) {
    console.error(
      `Unable to parse JSON output when parsing directory [remote]: ${directory}`
    );
    console.error(`Received output: ${JSON.stringify(text)}`);
    throw e;
  }
}

export async function getAllServers() {
  const time = new Date().toISOString();
  return pMap(Object.entries(explorerUrls), async ([genre, server]) => {
    type Result = { list: any[]; from: "remote" | "local"; error?: string };
    const result: Result = await fetchServer(server)
      .then((x) => ({ list: x, from: "local" as const }))
      .catch((e) => {
        console.error(`Unable to fetch data for server [local] ${server}`, e);
        return { list: [], from: "local" as const, error: String(e) };
      })
      .then((x): Promise<Result> | Result => {
        if (x.list.length > 0) {
          return x;
        }
        return fetchFromRemote(server)
          .then((y) => ({ ...x, list: y, from: "remote" as const }))
          .catch((e) => {
            console.error(
              `Unable to fetch data for server [remote] ${server}`,
              e
            );
            return {
              ...x,
              list: [],
              from: "remote" as const,
              error: String(e),
            };
          });
      });
    return { time, genre, ...result };
  });
}
