import fetchGitStats from "./fetchGitStats.js";
import ora from "ora";

const username = process.argv[2];

if (!username) {
  console.error("❌ Please provide a GitHub username.");
  process.exit(1);
}

const spinner = ora("Fetching GitHub stats...").start();

try {
  const stats = await fetchGitStats(username);
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
