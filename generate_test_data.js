/**
 * Test Data Generator
 *
 * This script generates realistic test data for the CaféManager system to facilitate
 * development and testing. It utilizes the Faker library to create synthetic data for
 * various entities, including customers, orders, menu items, and staff members.
 *
 * Key Features:
 * - **Customizable Data Generation**: Allows configuration of the number of records to generate
 *   for each entity, making it adaptable to different testing scenarios.
 * - **Output Directory Management**: Specifies the directory where the generated test data files
 *   will be saved, ensuring organized data storage.
 * - **Date Range Configuration**: Supports setting a date range for generated orders, enabling
 *   realistic testing of time-sensitive features.
 *
 * Usage:
 * To use this generator, instantiate the [TestDataGenerator] class with desired configurations,
 * method to create all test data:
 *
 * ```javascript
 * const generator = new TestDataGenerator();
 * generator.generateAll().catch(console.error);
 * ```
 *
 * Ensure that the necessary dependencies (e.g., Faker) are installed and that the output
 * directory exists before running the script.
 */

const fs = require('fs');
const path = require('path');
const faker = require('faker');

class TestDataGenerator {
    constructor(config = {}) {
        this.config = {
            customersCount: 1000,
            ordersCount: 5000,
            menuItemsCount: 100,
            staffCount: 50,
            startDate: new Date('2023-01-01'),
            endDate: new Date(),
            outputDir: path.join(__dirname, '..', 'database', 'test_data'),
            ...config
        };

        this.menuCategories = [
            'Hot Drinks', 'Cold Drinks', 'Breakfast', 'Lunch', 
            'Dinner', 'Desserts', 'Snacks', 'Specials'
        ];

        this.drinkTypes = [
            'Coffee', 'Tea', 'Latte', 'Cappuccino', 'Espresso', 
            'Smoothie', 'Juice', 'Soda', 'Frappe', 'Mocha'
        ];

        this.foodTypes = [
            'Sandwich', 'Salad', 'Soup', 'Pasta', 'Burger', 
            'Pizza', 'Wrap', 'Bowl', 'Pastry', 'Cake'
        ];

        // Initialize data containers
        this.customers = [];
        this.menuItems = [];
        this.staff = [];
        this.orders = [];
        this.inventory = [];
    }

    /**
     * Generate all test data
     */
    async generateAll() {
        console.log('Generating test data...');

        this.generateCustomers();
        this.generateMenuItems();
        this.generateStaff();
        this.generateOrders();
        this.generateInventory();

        await this.saveToFiles();
        console.log('Test data generation complete!');
    }

    /**
     * Generate customer data
     */
    generateCustomers() {
        console.log('Generating customers...');
        
        for (let i = 0; i < this.config.customersCount; i++) {
            this.customers.push({
                id: `CUST${String(i + 1).padStart(6, '0')}`,
                first_name: faker.name.firstName(),
                last_name: faker.name.lastName(),
                email: faker.internet.email(),
                phone: faker.phone.phoneNumber(),
                address: {
                    street: faker.address.streetAddress(),
                    city: faker.address.city(),
                    state: faker.address.stateAbbr(),
                    zip: faker.address.zipCode()
                },
                created_at: faker.date.between(this.config.startDate, this.config.endDate),
                preferences: {
                    favorite_items: [],
                    dietary_restrictions: this.generateDietaryRestrictions(),
                    preferred_payment: faker.helpers.randomize(['credit_card', 'cash', 'mobile_payment'])
                },
                loyalty_points: faker.datatype.number({ min: 0, max: 1000 })
            });
        }
    }

    /**
     * Generate menu items
     */
    generateMenuItems() {
        console.log('Generating menu items...');
        
        for (let i = 0; i < this.config.menuItemsCount; i++) {
            const category = faker.helpers.randomize(this.menuCategories);
            const isDrink = category.includes('Drinks');
            const name = isDrink ? 
                `${faker.helpers.randomize(this.drinkTypes)} ${faker.commerce.productAdjective()}` :
                `${faker.commerce.productAdjective()} ${faker.helpers.randomize(this.foodTypes)}`;

            this.menuItems.push({
                id: `ITEM${String(i + 1).padStart(6, '0')}`,
                name,
                category,
                description: faker.commerce.productDescription(),
                price: parseFloat(faker.commerce.price(3, 25, 2)),
                cost: parseFloat(faker.commerce.price(1, 10, 2)),
                preparation_time: faker.datatype.number({ min: 2, max: 15 }),
                is_available: faker.datatype.boolean(0.9),
                allergens: this.generateAllergens(),
                nutrition: this.generateNutritionInfo(),
                ingredients: this.generateIngredients(isDrink),
                image_url: `https://example.com/images/menu/${i + 1}.jpg`,
                created_at: faker.date.past(1),
                updated_at: faker.date.recent()
            });
        }
    }

    /**
     * Generate staff data
     */
    generateStaff() {
        console.log('Generating staff...');
        
        const roles = ['server', 'barista', 'chef', 'manager', 'cashier'];
        const shifts = ['morning', 'afternoon', 'evening'];

        for (let i = 0; i < this.config.staffCount; i++) {
            this.staff.push({
                id: `STAFF${String(i + 1).padStart(4, '0')}`,
                first_name: faker.name.firstName(),
                last_name: faker.name.lastName(),
                email: faker.internet.email(),
                phone: faker.phone.phoneNumber(),
                role: faker.helpers.randomize(roles),
                hire_date: faker.date.past(2),
                preferred_shifts: faker.helpers.arrayElements(shifts, faker.datatype.number({ min: 1, max: 2 })),
                performance: {
                    average_rating: faker.datatype.float({ min: 3.5, max: 5, precision: 0.1 }),
                    orders_processed: faker.datatype.number({ min: 100, max: 1000 }),
                    customer_feedback: faker.datatype.float({ min: 4, max: 5, precision: 0.1 })
                }
            });
        }
    }

    /**
     * Generate order data
     */
    generateOrders() {
        console.log('Generating orders...');
        
        const orderStatuses = ['completed', 'cancelled', 'in_progress', 'pending'];
        const orderTypes = ['dine_in', 'takeaway', 'delivery', 'online'];

        for (let i = 0; i < this.config.ordersCount; i++) {
            const itemCount = faker.datatype.number({ min: 1, max: 5 });
            const items = [];
            let subtotal = 0;

            for (let j = 0; j < itemCount; j++) {
                const menuItem = faker.helpers.randomize(this.menuItems);
                const quantity = faker.datatype.number({ min: 1, max: 3 });
                const itemTotal = menuItem.price * quantity;
                subtotal += itemTotal;

                items.push({
                    item_id: menuItem.id,
                    name: menuItem.name,
                    quantity,
                    unit_price: menuItem.price,
                    total: itemTotal,
                    modifications: this.generateModifications()
                });
            }

            const tax = subtotal * 0.08; // 8% tax
            const delivery_fee = faker.helpers.randomize(orderTypes) === 'delivery' ? 5 : 0;
            const total = subtotal + tax + delivery_fee;

            this.orders.push({
                id: `ORD${String(i + 1).padStart(8, '0')}`,
                customer_id: faker.helpers.randomize(this.customers).id,
                staff_id: faker.helpers.randomize(this.staff).id,
                type: faker.helpers.randomize(orderTypes),
                status: faker.helpers.randomize(orderStatuses),
                items,
                subtotal: parseFloat(subtotal.toFixed(2)),
                tax: parseFloat(tax.toFixed(2)),
                delivery_fee,
                total: parseFloat(total.toFixed(2)),
                created_at: faker.date.between(this.config.startDate, this.config.endDate),
                completed_at: null, // Will be set later
                notes: faker.datatype.boolean(0.3) ? faker.lorem.sentence() : null,
                rating: faker.datatype.boolean(0.4) ? faker.datatype.number({ min: 1, max: 5 }) : null,
                feedback: faker.datatype.boolean(0.2) ? faker.lorem.paragraph() : null
            });
        }

        // Sort orders by date and set completion times
        this.orders.sort((a, b) => a.created_at - b.created_at);
        this.orders.forEach(order => {
            if (order.status === 'completed') {
                order.completed_at = new Date(order.created_at.getTime() + faker.datatype.number({ min: 10, max: 60 }) * 60000);
            }
        });
    }

    /**
     * Generate inventory data
     */
    generateInventory() {
        console.log('Generating inventory...');
        
        const units = ['g', 'kg', 'ml', 'l', 'pieces', 'packages'];
        
        this.menuItems.forEach(item => {
            item.ingredients.forEach(ingredient => {
                if (!this.inventory.some(inv => inv.name === ingredient)) {
                    this.inventory.push({
                        id: `INV${String(this.inventory.length + 1).padStart(6, '0')}`,
                        name: ingredient,
                        category: faker.helpers.randomize(['dairy', 'produce', 'meat', 'beverages', 'dry_goods', 'supplies']),
                        unit: faker.helpers.randomize(units),
                        quantity: faker.datatype.number({ min: 50, max: 500 }),
                        minimum_quantity: faker.datatype.number({ min: 20, max: 50 }),
                        cost_per_unit: parseFloat(faker.commerce.price(0.5, 10, 2)),
                        supplier: {
                            name: faker.company.companyName(),
                            contact: faker.phone.phoneNumber(),
                            lead_time_days: faker.datatype.number({ min: 1, max: 7 })
                        },
                        last_ordered: faker.date.recent(30),
                        last_received: faker.date.recent(25)
                    });
                }
            });
        });
    }

    /**
     * Generate dietary restrictions
     * @returns {Array} List of dietary restrictions
     * @private
     */
    generateDietaryRestrictions() {
        const restrictions = ['vegetarian', 'vegan', 'gluten-free', 'dairy-free', 'nut-free', 'halal', 'kosher'];
        return faker.datatype.boolean(0.3) ? 
            faker.helpers.arrayElements(restrictions, faker.datatype.number({ min: 1, max: 2 })) : 
            [];
    }

    /**
     * Generate allergens
     * @returns {Array} List of allergens
     * @private
     */
    generateAllergens() {
        const allergens = ['nuts', 'dairy', 'eggs', 'soy', 'wheat', 'fish', 'shellfish'];
        return faker.helpers.arrayElements(allergens, faker.datatype.number({ min: 0, max: 3 }));
    }

    /**
     * Generate nutrition information
     * @returns {Object} Nutrition information
     * @private
     */
    generateNutritionInfo() {
        return {
            calories: faker.datatype.number({ min: 50, max: 800 }),
            protein: faker.datatype.number({ min: 0, max: 30 }),
            carbohydrates: faker.datatype.number({ min: 0, max: 100 }),
            fat: faker.datatype.number({ min: 0, max: 30 }),
            fiber: faker.datatype.number({ min: 0, max: 10 }),
            sugar: faker.datatype.number({ min: 0, max: 50 })
        };
    }

    /**
     * Generate ingredients
     * @param {boolean} isDrink Whether the item is a drink
     * @returns {Array} List of ingredients
     * @private
     */
    generateIngredients(isDrink) {
        const drinkIngredients = [
            'Coffee Beans', 'Milk', 'Water', 'Sugar', 'Cream', 
            'Syrup', 'Ice', 'Tea Leaves', 'Chocolate', 'Caramel'
        ];
        
        const foodIngredients = [
            'Bread', 'Lettuce', 'Tomato', 'Cheese', 'Chicken', 
            'Beef', 'Rice', 'Pasta', 'Eggs', 'Flour'
        ];
        
        const baseIngredients = isDrink ? drinkIngredients : foodIngredients;
        return faker.helpers.arrayElements(baseIngredients, faker.datatype.number({ min: 2, max: 6 }));
    }

    /**
     * Generate order modifications
     * @returns {Array} List of modifications
     * @private
     */
    generateModifications() {
        const modifications = [
            'Extra Hot', 'No Ice', 'Extra Shot', 'Sugar Free',
            'No Whip', 'Light Ice', 'Extra Cream', 'No Foam'
        ];
        
        return faker.datatype.boolean(0.3) ? 
            faker.helpers.arrayElements(modifications, faker.datatype.number({ min: 1, max: 2 })) : 
            [];
    }

    /**
     * Save generated data to JSON files
     */
    async saveToFiles() {
        console.log('Saving data to files...');
        
        if (!fs.existsSync(this.config.outputDir)) {
            fs.mkdirSync(this.config.outputDir, { recursive: true });
        }

        const files = {
            'customers.json': this.customers,
            'menu_items.json': this.menuItems,
            'staff.json': this.staff,
            'orders.json': this.orders,
            'inventory.json': this.inventory
        };

        for (const [filename, data] of Object.entries(files)) {
            const filePath = path.join(this.config.outputDir, filename);
            await fs.promises.writeFile(filePath, JSON.stringify(data, null, 2));
            console.log(`Saved ${filename}`);
        }
    }
}

// Create and run the generator
const generator = new TestDataGenerator();
generator.generateAll().catch(console.error);
