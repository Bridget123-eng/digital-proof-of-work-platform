import axios from "axios";

/**
 * Extract owner and repo name from a GitHub URL
 * @param {string} url GitHub URL
 * @returns {{owner: string, repo: string} | null}
 */
export const parseGithubUrl = (url) => {
<<<<<<< HEAD
  try {
    const parsedUrl = new URL(String(url || "").trim());
    const hostname = parsedUrl.hostname.toLowerCase();
    const pathParts = parsedUrl.pathname.split("/").filter(Boolean);

    if (!["github.com", "www.github.com"].includes(hostname) || pathParts.length < 2) {
      return null;
    }

    const [owner, rawRepo] = pathParts;
    const repo = rawRepo.replace(/\.git$/, "");
    if (!/^[A-Za-z0-9_.-]+$/.test(owner) || !/^[A-Za-z0-9_.-]+$/.test(repo)) {
      return null;
    }

    return { owner, repo };
  } catch {
    return null;
  }
};

const githubRequest = (url, token = null) =>
  axios.get(url, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
    timeout: 8000,
  });

=======
  if (!url) return null;
  const match = url.match(/github\.com\/([^/]+)\/([^/]+)/);
  if (!match) return null;
  return {
    owner: match[1],
    repo: match[2].replace(/\.git$/, ""),
  };
};

>>>>>>> 870403f96cbdd80795c1c0b06a5b2872cba0250d
/**
 * Fetch repository metadata from GitHub API
 * @param {string} owner Repository owner
 * @param {string} repo Repository name
 * @param {string} token GitHub personal access token (optional)
 * @returns {Promise<Object>}
 */
export const fetchRepoMetadata = async (owner, repo, token = null) => {
<<<<<<< HEAD
  const { data } = await githubRequest(`https://api.github.com/repos/${owner}/${repo}`, token);
=======
  const headers = token ? { Authorization: `token ${token}` } : {};
  const { data } = await axios.get(`https://api.github.com/repos/${owner}/${repo}`, { headers });
>>>>>>> 870403f96cbdd80795c1c0b06a5b2872cba0250d
  return {
    name: data.name,
    description: data.description,
    stars: data.stargazers_count,
    forks: data.forks_count,
    language: data.language,
    languages_url: data.languages_url,
    updated_at: data.updated_at,
    created_at: data.created_at,
    license: data.license?.name,
    topics: data.topics,
  };
};

/**
 * Fetch repository languages from GitHub API
 * @param {string} languagesUrl URL to fetch languages
 * @param {string} token GitHub personal access token (optional)
 * @returns {Promise<Object>}
 */
export const fetchRepoLanguages = async (languagesUrl, token = null) => {
<<<<<<< HEAD
  const { data } = await githubRequest(languagesUrl, token);
=======
  const headers = token ? { Authorization: `token ${token}` } : {};
  const { data } = await axios.get(languagesUrl, { headers });
>>>>>>> 870403f96cbdd80795c1c0b06a5b2872cba0250d
  return data;
};

/**
 * Fetch repository activity (commits) from GitHub API
 * @param {string} owner Repository owner
 * @param {string} repo Repository name
 * @param {string} token GitHub personal access token (optional)
 * @returns {Promise<Array>}
 */
export const fetchRepoActivity = async (owner, repo, token = null) => {
<<<<<<< HEAD
  const { data } = await githubRequest(`https://api.github.com/repos/${owner}/${repo}/commits?per_page=10`, token);
=======
  const headers = token ? { Authorization: `token ${token}` } : {};
  const { data } = await axios.get(`https://api.github.com/repos/${owner}/${repo}/commits?per_page=10`, { headers });
>>>>>>> 870403f96cbdd80795c1c0b06a5b2872cba0250d
  return data.map((commit) => ({
    sha: commit.sha,
    author: commit.commit.author.name,
    date: commit.commit.author.date,
    message: commit.commit.message,
  }));
};

/**
 * Analyze a GitHub repository and return summary data
 * @param {string} url GitHub repository URL
 * @returns {Promise<Object>}
 */
export const analyzeGithubRepo = async (url) => {
  const parsed = parseGithubUrl(url);
  if (!parsed) return null;

  try {
    const { owner, repo } = parsed;
<<<<<<< HEAD
    const token = process.env.GITHUB_TOKEN || null;
    const metadata = await fetchRepoMetadata(owner, repo, token);
    const languages = await fetchRepoLanguages(metadata.languages_url, token);
    const activity = await fetchRepoActivity(owner, repo, token);
=======
    const metadata = await fetchRepoMetadata(owner, repo);
    const languages = await fetchRepoLanguages(metadata.languages_url);
    const activity = await fetchRepoActivity(owner, repo);
>>>>>>> 870403f96cbdd80795c1c0b06a5b2872cba0250d

    return {
      metadata,
      languages,
      activity,
      analyzedAt: new Date(),
    };
  } catch (error) {
    console.error("Error analyzing GitHub repo:", error.message);
    return null;
  }
};
