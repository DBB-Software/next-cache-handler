/**
 * @type {import('semantic-release').GlobalConfig}
 */
module.exports = {
  branches: ['main'],
  tagFormat: 'v${version}-next-cache-handler-redis',
  plugins: [
    [
      '@semantic-release/commit-analyzer',
      {
        preset: 'conventionalcommits',
        releaseRules: [
          { type: 'feat', scope: '*', release: 'patch' },
          { type: 'bug', scope: '*', release: 'patch' },
          { type: 'chore', release: false },
          { breaking: true, release: 'minor' }
        ],
        parserOpts: {
          headerPattern: /^(\w+)(?:\(([\w-]+)\))?:\s*(.*)$/,
          headerCorrespondence: ['type', 'scope', 'subject']
        }
      }
    ],
    [
      '@semantic-release/release-notes-generator',
      {
        preset: 'conventionalcommits',
        parserOpts: {
          headerPattern: /^(\w+)(?:\(([\w-]+)\))?:\s*(.*)$/,
          headerCorrespondence: ['type', 'scope', 'subject']
        }
      }
    ],
    [
      '@semantic-release/changelog',
      {
        changeLogFile: 'CHANGELOG.md'
      }
    ],
    [
      '@semantic-release/git',
      {
        assets: ['dist/', 'package.json', 'CHANGELOG.md']
      }
    ],
    '@semantic-release/github',
    [
      '@semantic-release/npm',
      {
        pkgRoot: './'
      }
    ]
  ]
}
