Feature: Product Catalog Viewing
  As a shopper, I want to view a product catalog so that I can browse available items before making a purchase decision.

  Background:
    Given the product catalog page is accessible

  @functional
  Scenario: Display all active products with key details
    When a shopper visits the product catalog page
    Then all active products must be displayed with an image, name, category, price, and an Add to Cart button

  @ui @responsive
  Scenario: Responsive grid layout for product display
    When products are displayed
    Then they must appear in a responsive grid layout

  @sorting
  Scenario: Products sorted alphabetically by name
    When products are displayed
    Then they must be sorted alphabetically by name (A-Z) by default

  @ui
  Scenario: Display total count of products
    When products are displayed
    Then the total count of products must be shown

  @ui @functional
  Scenario: Out of Stock label for unavailable products
    Given a product is out of stock
    When it is displayed
    Then the Add to Cart button must be replaced with an Out of Stock label

  @edgecase
  Scenario: No products available message
    Given no products exist in the catalog
    When the page is loaded
    Then a message "No products available at the moment" must be displayed

  @performance
  Scenario: Page load performance with up to 100 products
    When the product catalog page is loaded with up to 100 products
    Then it must load within 2 seconds