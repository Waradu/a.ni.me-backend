import axios from "axios";
import type { GithubRelease } from "../types/github";
import type { Latest } from "../types/latest";
import { isValidLatest } from "./validateLatest";
import { db } from "./wirekvs";

export const syncRelease = async (release: GithubRelease) => {
  const releaseJson = release.assets.find(
    (asset) => asset.name === "latest.json"
  );

  if (!releaseJson) {
    console.error(
      `JSON not found for '${release.prerelease ? "pre" : "stable"}'.`
    );
    return;
  }

  const response = await axios.get<Latest>(releaseJson.browser_download_url);

  if (!isValidLatest(response.data)) {
    console.error(
      `JSON is not valid for '${
        release.prerelease ? "pre" : "stable"
      }'. Response: '${JSON.stringify(response.data)}'`
    );
    return;
  }

  const key = release.prerelease ? "latest-pre" : "latest";

  await db.set(key, response.data);
};
