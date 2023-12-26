import { execa } from "execa";

export async function fetchServers(directory: string) {
  return await execa("php", ["servers.php", `directory=${directory}`], {
    timeout: 10000,
  });
}

export async function getAllServers() {
  const result = await fetchServers("anygenre1.jamulus.io:22124");
  try {
    return JSON.parse(result.stdout);
  } catch (e) {
    console.error("Unable to parse JSON output. Raw output:", result.stdout);
    throw e;
  }
}
