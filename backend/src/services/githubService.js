import axios from "axios";

/**
 * Extract owner and repo name from a GitHub URL
 * @param {string} url GitHub URL
 * @returns {{owner: string, repo: string} | null}
 */
export const parseGithubUrl = (url) => {
  if (!url) return null;
  const match = url.match(/github\.com\/([^/]+)\/([^/]+)/);
  if (!match) return null;
  return {
    owner: match[1],
    repo: match[2].replace(/\.git$/, ""),
  };
};

/**
 * Fetch repository metadata from GitHub API
 * @param {string} owner Repository owner
 * @param {string} repo Repository name
 * @param {string} token GitHub personal access token (optional)
 * @returns {Promise<Object>}
 */
export const fetchRepoMetadata = async (owner, repo, token = null) => {
  const headers = token ? { Authorization: `token ${token}` } : {};
  const { data } = await axios.get(`https://api.github.com/repos/${owner}/${repo}`, { headers });
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
  const headers = token ? { Authorization: `token ${token}` } : {};
  const { data } = await axios.get(languagesUrl, { headers });
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
  const headers = token ? { Authorization: `token ${token}` } : {};
  const { data } = await axios.get(`https://api.github.com/repos/${owner}/${repo}/commits?per_page=10`, { headers });
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
    const metadata = await fetchRepoMetadata(owner, repo);
    const languages = await fetchRepoLanguages(metadata.languages_url);
    const activity = await fetchRepoActivity(owner, repo);

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
