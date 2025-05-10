import axios from "axios";
import type { Router } from "express";
import { verifySignature } from "../utils/validateSignature";
import type { GithubRelease } from "../types/github";
import { syncRelease } from "../utils/syncRelease";
import { db } from "../utils/wirekvs";
import type { Latest } from "../types/latest";

const githubWebhookSecret = process.env.GITHUB_WEBHOOK_SECRET;

if (!githubWebhookSecret)
  throw new Error("'GITHUB_WEBHOOK_SECRET' env is required");

const url = "https://api.github.com/repos/Waradu/a.ni.me/releases";

export default (router: Router) => {
  router.post("/release", async (req, res) => {
    const type = req.headers["x-github-event"] as string;

    if (type == "ping") {
      res.status(200).json({ message: "pong" });
      return;
    }

    const sig = req.headers["x-hub-signature-256"] as string;

    if (!sig) {
      res.status(400).json({
        error: "Signature is required.",
      });
      return;
    }

    const isValid = await verifySignature(
      githubWebhookSecret,
      sig,
      req.rawBody
    );

    if (!isValid) {
      console.error("Signature is invalid.");
      res.status(400).json({
        error: "Signature is invalid.",
      });
      return;
    }

    try {
      const response = await axios.get<GithubRelease[]>(url);
      const releases = response.data
        .sort(
          (a, b) =>
            new Date(b.published_at).getTime() -
            new Date(a.published_at).getTime()
        )
        .filter((release) => !release.draft);

      const latest = releases.find((release) => !release.prerelease);
      const latestPrerelease = releases.find((release) => release.prerelease);

      if (latest) syncRelease(latest);
      if (latestPrerelease) syncRelease(latestPrerelease);

      res.send();
    } catch (e) {
      console.error(e);

      res.status(500).send();
    }
  });

  router.get("/latest", async (req, res) => {
    let prerelease = "query" in req.query;

    try {
      const latest = await db.get<Latest>("latest");
      const latestPrerelease = await db.get<Latest>("latest-pre");

      if (!latestPrerelease && !latestPrerelease) {
        res.status(404).json({
          error: "No updates found",
        });
      } else if (!latestPrerelease) prerelease = false;
      else if (!latest) prerelease = true;

      res.json(prerelease ? latestPrerelease : latest);
      return;
    } catch (e) {
      console.error(e);

      res.status(500).send();
    }
  });
};
