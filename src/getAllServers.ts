import { execa } from "execa";

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
  return await fetchServer("anygenre1.jamulus.io:22124");
}
