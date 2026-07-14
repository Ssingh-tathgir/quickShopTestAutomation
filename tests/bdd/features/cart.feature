Feature: Cart Management
  As a QuickShop customer
  I want to manage my shopping cart
  So that I can review and purchase the products I want

  Background:
    Given I am logged in as a registered user

  Scenario: View empty cart
    When I navigate to the cart page
    Then I should see the "Shopping Cart" heading
    And I should see "Your cart is empty"
    And I should see a "Continue Shopping" link

  Scenario: Add a product to cart from the product list
    Given I am on the products page
    When I click "Add to Cart" for the first available product
    Then I should see a success toast notification
    And the cart count badge in the navbar should be greater than 0

  Scenario: View cart with a seeded item
    Given I have 1 unit of a product in my cart
    When I navigate to the cart page
    Then I should see the product listed in the cart
    And I should see the "Order Summary" section
    And I should see a "Proceed to Checkout" button

  Scenario: Increase item quantity in cart
    Given I have 1 unit of a product with at least 2 in stock in my cart
    When I navigate to the cart page
    And I click the increase quantity button for that product
    Then the item quantity should be 2
    And the subtotal should reflect the updated quantity

  Scenario: Decrease button is disabled at minimum quantity
    Given I have 1 unit of a product in my cart
    When I navigate to the cart page
    Then the decrease quantity button should be disabled

  Scenario: Remove item from cart
    Given I have 1 unit of a product in my cart
    When I navigate to the cart page
    And I click the "Remove" button for that product
    Then the cart should be empty
    And I should see "Your cart is empty"

  Scenario: Proceed to checkout
    Given I have 1 unit of a product in my cart
    When I navigate to the cart page
    And I click "Proceed to Checkout"
    Then I should be navigated to the checkout page

  Scenario: Continue shopping from cart page
    When I navigate to the cart page
    And I click "Continue Shopping"
    Then I should be navigated to the products page

  Scenario: Unauthenticated user is redirected to login
    Given I am not logged in
    When I navigate to the cart page
    Then I should be redirected to the login page
