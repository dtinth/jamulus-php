# Jamulus Server List Archive Project

This project aims to take snapshots of the public Jamulus server list, as seen on [Jamulus Explorer](https://explorer.jamulus.io/).

Every few minutes, a snapshot is taken of the following directories:

- Any Genre 1
- Any Genre 2
- Any Genre 3
- Genre Rock
- Genre Jazz
- Genre Classical/Folk
- Genre Choral/Barbershop

There are 2 main ways to access the data:

- **Latest snapshots:** Provides access to last 20 snapshots. Useful for real-time visualizations.
- **Historical snapshots:** Provides updates to daily archive of snapshots since 2023-08-01. Updated daily. Can be useful for historical analysis. For example, I used this data to generate [a report of most active Jamulus user names in 2023](https://im.dt.in.th/ipfs/bafybeibb5ktv7g66ieffqdqkml4jsrzoko2seeoi2tr3kibv65qoduizky/2023.webp) for the [MJTH.live](https://mjth.live/) server.

## Access latest snapshots

First, download the latest information file from <https://jamulus-archive.ap-south-1.linodeobjects.com/main/latest.json>. This file will contain the following information:

```ts
interface InformationFile {
  /** Key of the latest snapshot */
  key: string;

  /** Compression size of the latest snapshot */
  size: number;

  /** Uncompressed size of the latest snapshot */
  uncompressedSize: number;

  /** Statistics of the data points contained in the latest snapshot */
  stats: {
    /** Timestamp of the data point */
    time: string;

    /** Directory name of the data point */
    genre: string;

    /** Number of servers in the data point */
    count: number;
  }[];

  /** History of 20 previous snapshots */
  history: Omit<InformationFile, "history">[];
}
```

Look at the `key` property of the latest snapshot. Use it to construct the URL of the latest snapshot:

```ts
const snapshotUrl = `https://jamulus-archive.ap-south-1.linodeobjects.com/${key}`;
```

The snapshot file is a GZIP-compressed JSON file. Once downloaded and decompressed, it will contain an array of `DataPoint` objects (see section below for schema).

## Accessing historical snapshots

Every day, all data points in a given day (assuming UTC timezone) are compressed into a single file. The URL of a daily archive is constructed as follows:

```ts
const dailyUrl = `https://jamulus-archive.ap-south-1.linodeobjects.com/main/daily/${yyyy}-${mm}/${yyyy}-${mm}-${dd}.ndjson.br`;
```

- The first available daily archive file is on **2023-08-01**.
- A compressed file is about **300 KB** large.
- When decompressed, it is about **38 MB** large.
- Daily archival process is scheduled daily at 5 AM (UTC). The consolidation process may take a few minutes, so the file may not be available immediately. It runs on GitHub Actions, so if it has an outage, the file may not be available at all. It will be retried the next day.
- The daily archive file is a newline-delimited JSON file, compressed with Brotli compression. Each line is a `DataPoint` object (see section below for schema).

## Data point schema

A `DataPoint` object represents a point-in-time snapshot of a single directory server.

```ts
/** Represents a point-in-time snapshot of a single directory */
interface DataPoint {
  /** Timestamp of this data point */
  time: string;

  /** The directory name of this data point */
  genre: string;

  /** Servers in this data point */
  list: JamulusExplorerServer[];

  // There are a few other properties prefixed with `_` that are
  // used internally for debugging purposes.
  // They are not documented here and should not be relied upon.
}

/** Direct output from Jamulus Explorer (see `servers.php`) */
export interface JamulusExplorerServer {
  numip: number;
  port: number;
  country: string;
  maxclients: number;
  perm: number;
  name: string;
  ipaddrs: string;
  city: string;
  ip: string;
  ping: number;
  os: string;
  version: string;
  versionsort: string;
  nclients?: number;
  clients?: JamulusExplorerClient[];
  index: number;
}

export interface JamulusExplorerClient {
  chanid: number;
  country: string;
  instrument: string;
  skill: string;
  name: string;
  city: string;
}
```
