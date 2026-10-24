const { test } = require('node:test');
const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const { join } = require('node:path');
const workflow = readFileSync(join(__dirname, '../workflows/issue-triage.yml'), 'utf8').replace(/\r\n/g, '\n');
const script = workflow.split('          script: |\n')[1].split('\n').map(line => line.startsWith('            ') ? line.slice(12) : line).join('\n');
const AsyncFunction = Object.getPrototypeOf(async function () {}).constructor;

async function runIssue(issue, { action = 'opened', candidates = [], comments = [] } = {}) {
  const calls = [];
  const issues = {
    getLabel: async () => ({}),
    createLabel: async data => calls.push(['createLabel', data]),
    addLabels: async data => calls.push(['addLabels', data]),
    listForRepo: async () => ({ data: candidates }),
    listComments: () => {},
    createComment: async data => calls.push(['createComment', data]),
    updateComment: async data => calls.push(['updateComment', data]),
  };
  await new AsyncFunction('context', 'github', 'core', script)(
    { repo: { owner: 'owner', repo: 'repo' }, payload: { issue, action } },
    { rest: { issues }, paginate: async () => comments }, { warning: () => {} },
  );
  return calls;
}

test('complete bug form gets additive labels without a template nag', async () => {
  const issue = { number: 4, state: 'open', title: '[Bug] Python runtime does not start', body: '### Report type\nBug\n### Summary\nFailure\n### Expected behavior\nStart\n### Steps to reproduce\nRun doctor\n### Environment\nWindows' };
  const calls = await runIssue(issue);
  assert.deepEqual(calls.filter(call => call[0] === 'addLabels').map(call => call[1].labels[0]), ['needs-triage', 'bug']);
  assert.ok(!calls.some(call => call[0] === 'createComment'));
});

test('untrusted prose is never executed and duplicate matching only suggests', async () => {
  const issue = { number: 4, state: 'open', title: '[Bug] Python runtime does not start', body: '### Report type\nBug\n### Summary\n${process.exit(42)} `evil`' };
  const calls = await runIssue(issue, { candidates: [{ number: 2, title: 'Python runtime does not start' }] });
  const comment = calls.find(call => call[0] === 'createComment')[1].body;
  assert.match(comment, /#2/);
  assert.match(comment, /Expected behavior/);
  assert.match(comment, /never closes/);
  assert.ok(!comment.includes('process.exit'));
  assert.ok(!workflow.includes('pull_request_target'));
  assert.ok(!workflow.includes('actions/checkout'));
  assert.ok(!workflow.includes('github.event.issue.body'));
});

test('edits update one bot comment and closed reports do nothing', async () => {
  const issue = { number: 4, state: 'open', title: 'Short', body: '### Report type\nFeature\n### Summary\nUseful\n### Use case\nStudy\n### Desired behavior\nHelp' };
  const calls = await runIssue(issue, { action: 'edited', comments: [{ id: 9, user: { login: 'github-actions[bot]' }, body: '<!-- tutorloop-issue-guidance-v1 --> old' }] });
  assert.ok(calls.some(call => call[0] === 'updateComment' && call[1].comment_id === 9));
  assert.ok(!calls.some(call => call[0] === 'createComment'));
  assert.deepEqual(await runIssue({ ...issue, state: 'closed' }), []);
});
