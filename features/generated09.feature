Feature: User Registration
  As a new visitor, I want to register with my name, email, and password so that I can access shopping features and track my orders.

  Background:
    Given the user is on the registration page

  @happy_path
  Scenario: Successful registration with valid data
    When the user enters valid First Name, Last Name, Email, Password, and Confirm Password
    And submits the registration form
    Then the user is redirected to the login page with a success message

  @negative
  Scenario: Registration fails with existing email
    When the user enters an email address that is already registered
    And submits the registration form
    Then an error message 'Email already registered' is displayed

  @edge_case
  Scenario: Password complexity validation
    When the user enters a password that does not meet complexity standards
    And submits the registration form
    Then an error message 'Password does not meet complexity requirements' is displayed

  @negative
  Scenario: Registration with empty fields
    When the user leaves all fields empty
    And submits the registration form
    Then error messages are displayed for each mandatory field

  @ui_validation
  Scenario: UI validation for registration form
    Then the registration page displays all fields and buttons correctly aligned
    And the form adjusts correctly on different screen sizes