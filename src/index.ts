import fetchGitStats from "./fetchGitStats.js";
import ora from "ora";
import { StorageManager } from "@/utils/storage";

const args = process.argv.slice(2);

if (args[0] === "config") {
  await handleConfigCommand(args.slice(1));
  process.exit(0);
}

const username = args[0];

if (!username) {
  console.error("❌ Please provide a GitHub username.");
  process.exit(1);
}

async function handleConfigCommand(args: string[]) {
  const [subcommand, token] = args;

  if (subcommand !== "key" || !token) {
    console.error("❌ Invalid command!");
    return;
  }

  await StorageManager.update((store) => ({
    ...store,
    token,
  }));

  console.log("✅ GitHub token saved!");
}

const store = await StorageManager.get();
const token = store.token;

if (!token) {
  console.error("❌ GitHub token not set.");
  process.exit(1);
}

const spinner = ora("Fetching GitHub stats...").start();

try {
  const stats = await fetchGitStats(username, token);
  spinner.stop();

  console.log(`\n👤 ${stats.name}`);
  console.log(`📝 ${stats.bio}\n`);

  console.log(`🔥 Current Streak: ${stats.currentStreak} days`);
  console.log(`🏆 Longest Streak: ${stats.longestStreak} days`);
  console.log(`🌟 Stars: ${stats.totalStars}`);
  console.log(`📊 Contributions: ${stats.totalContributions}\n`);
} catch (error) {
  spinner.fail("Failed to fetch GitHub stats.");
  const err = error as Error;
  console.error("❌", err.message);
}
