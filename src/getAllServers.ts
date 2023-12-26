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
      `Unable to parse JSON output when parsing directory: ${directory}`
    );
    console.error(`Received output: ${JSON.stringify(result.stdout)}`);
    throw e;
  }
}

export async function getAllServers() {
  const time = new Date().toISOString();
  return pMap(Object.entries(explorerUrls), async ([genre, server]) => {
    const list = await fetchServer(server).catch((e) => []);
    return { time, list, genre };
  });
}
