/**
 * Cucumber configuration for BDD (Behaviour-Driven Development) tests.
 *
 * Cucumber reads Gherkin feature files (.feature) and maps each
 * Given / When / Then step to a TypeScript function in the step-definitions folder.
 *
 * Run BDD tests with:  npm run test:bdd
 * Reports are written to: reports/cucumber/
 */
module.exports = {
  default: {
    // Where to find the Gherkin feature files describing test scenarios
    paths: ['tests/bdd/features/**/*.feature'],

    // Files to load before running tests:
    //   world.ts       — defines the shared test context (browser, page, test user)
    //   step-definitions — maps Gherkin steps to TypeScript functions
    require: [
      'tests/bdd/support/world.ts',
      'tests/bdd/step-definitions/**/*.ts',
    ],

    // Register ts-node so Cucumber can load TypeScript files directly
    // without a separate compilation step
    requireModule: ['ts-node/register'],

    format: [
      // progress-bar shows a live progress indicator in the terminal
      'progress-bar',
      // HTML report for sharing results with the team
      'html:reports/cucumber/report.html',
      // JSON report for integration with CI dashboards and third-party tools
      'json:reports/cucumber/report.json',
    ],

    // Suppress the Cucumber.io publish prompt in CI
    publishQuiet: true,

    // Maximum time (ms) a single step is allowed to run before timing out
    timeout: 30000,
  },
}
