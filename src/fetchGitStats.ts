import fetch from "node-fetch";
import dotenv from "dotenv";
import { StorageManager } from "@/utils/storage";

dotenv.config();

const GITHUB_API = "https://api.github.com/graphql";

function getQuery(from: string, to: string) {
  return `
    query GetStats($username: String!) {
      user(login: $username) {
        name
        bio
        createdAt
        repositories(first: 100, ownerAffiliations: OWNER) {
          nodes {
            stargazerCount
          }
        }
        contributionsCollection(from: \"${from}\", to: \"${to}\") {
          contributionCalendar {
            totalContributions
            weeks {
              contributionDays {
                date
                contributionCount
              }
            }
          }
        }
      }
    }
  `;
}

function calculateStreak(allDays: { date: string; contributionCount: number }[]): { currentStreak: number; longestStreak: number } {
  let currentStreak = 0;
  let longestStreak = 0;
  let tempStreak = 0;

  allDays.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

  for (let i = 0; i < allDays.length; i++) {
    const { contributionCount } = allDays[i];
    if (contributionCount > 0) {
      tempStreak++;
      if (tempStreak > longestStreak) longestStreak = tempStreak;
    } else {
      tempStreak = 0;
    }
  }

  for (let i = allDays.length - 1; i >= 0; i--) {
    if (allDays[i].contributionCount > 0) {
      currentStreak++;
    } else {
      break;
    }
  }

  return { currentStreak, longestStreak };
}

async function fetchGitStats(username: string, token: string) {
  const now = new Date();
  const currentYear = now.getFullYear();
  const to = now.toISOString();

  const userQuery = `
    query GetUser($username: String!) {
      user(login: $username) {
        createdAt
      }
    }
  `;

  const userRes = await fetch(GITHUB_API, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ query: userQuery, variables: { username } }),
  });

  const userJson = (await userRes.json()) as {
    data: {
      user: {
        createdAt: string;
      };
    };
  };
  const createdAt = userJson.data.user.createdAt;
  const createdYear = new Date(createdAt).getFullYear();

  let allContributions = 0;
  let allDays: { date: string; contributionCount: number }[] = [];
  let name = "";
  let bio = "";
  let stars = 0;

  for (let year = createdYear; year <= currentYear; year++) {
    const from = `${year}-01-01T00:00:00Z`;
    const toDate = year === currentYear ? to : `${year}-12-31T23:59:59Z`;
    const query = getQuery(from, toDate);

    const response = await fetch(GITHUB_API, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ query, variables: { username } }),
    });

    const result = (await response.json()) as {
      data: {
        user: {
          name: string;
          bio: string;
          createdAt: string;
          repositories: { nodes: { stargazerCount: number }[] };
          contributionsCollection: {
            contributionCalendar: {
              totalContributions: number;
              weeks: {
                contributionDays: {
                  date: string;
                  contributionCount: number;
                }[];
              }[];
            };
          };
        };
      };
      errors?: { message: string }[];
    };

    if (result.errors) throw new Error(result.errors[0].message);

    const user = result.data.user;
    name = user.name;
    bio = user.bio;
    if (year === currentYear) {
      stars = user.repositories.nodes.reduce((acc, repo) => acc + repo.stargazerCount, 0);
    }

    const { totalContributions, weeks } =
      user.contributionsCollection.contributionCalendar;
    allContributions += totalContributions;
    allDays.push(...weeks.flatMap((week) => week.contributionDays));
  }

  const { currentStreak, longestStreak } = calculateStreak(allDays);

  return {
    name,
    bio,
    totalStars: stars,
    totalContributions: allContributions,
    currentStreak,
    longestStreak,
  };
}

export default fetchGitStats;
