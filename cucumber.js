module.exports = {
  default: {
    paths: ['tests/bdd/features/**/*.feature'],
    require: [
      'tests/bdd/support/world.ts',
      'tests/bdd/step-definitions/**/*.ts',
    ],
    requireModule: ['ts-node/register'],
    format: [
      'progress-bar',
      'html:reports/cucumber/report.html',
      'json:reports/cucumber/report.json',
    ],
    publishQuiet: true,
    timeout: 30000,
  },
}
