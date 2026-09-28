import assert from 'node:assert/strict';
const api = 'https://git.cdot.io/api/v1';
const repo = process.env.GITHUB_REPOSITORY;
assert.equal(process.env.GITHUB_REF, 'refs/heads/main');
assert.ok(repo?.startsWith('cdot/prisma-airs-'));
const headers = {
  Authorization: `token ${process.env.AIRS_RELEASE_TOKEN}`,
  'Content-Type': 'application/json',
};
async function get(path) {
  const response = await fetch(`${api}/repos/${repo}${path}`, { headers });
  assert.equal(response.status, 200, 'Forgejo verification failed');
  return response.json();
}
const main = await get('/branches/main');
const sha = main.commit.id;
assert.equal(sha, process.env.GITHUB_SHA, 'Source is no longer main; dispatch again');
const status = await get(`/commits/${sha}/status?limit=100`);
const required = [
  'CI / Lint, Format & Typecheck (push)',
  'Test / Tests (Node 18) (push)',
  'Test / Tests (Node 20) (push)',
  'Test / Tests (Node 22) (push)',
  'Test / Tests (Node 24) (push)',
];
for (const context of required) {
  assert.equal(
    status.statuses.find((s) => s.context === context)?.status,
    'success',
    `Required check: ${context}`,
  );
}
const name = `airs-docs-${sha}`;
const response = await fetch(`${api}/repos/${repo}/tags`, {
  method: 'POST',
  headers,
  body: JSON.stringify({ tag_name: name, target: sha }),
});
if (response.status === 409) {
  const existing = await get(`/tags/${name}`);
  assert.equal(existing.commit.sha, sha);
} else {
  assert.equal(response.status, 201, 'Release tag creation failed');
}
console.log(`Approved documentation source ${sha}; push mirror triggers GitHub Pages.`);
