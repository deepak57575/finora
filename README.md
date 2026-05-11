# Finora - Personal Finance Tracker

A modern, responsive personal finance tracking web application that helps you manage your income, expenses, loans, EMIs, and savings goals all in one place.

## Features

### 📊 Dashboard
Get an overview of your financial health with visual summaries of your income, expenses, and savings progress.

### 📅 Monthly Planner
Plan and track your monthly budget with categorized income and expense entries. Supports recurring transactions for automated monthly entries.

### 💰 Loan Tracker
Keep track of money lent to and borrowed from friends and family. Monitor due dates and payment status.

### ◷ EMI Tracker
Manage your Equated Monthly Installments (EMIs) for loans and purchases. Track remaining months and due dates.

### ◎ Savings Goals
Set financial goals with target amounts and track your progress towards achieving them.

### 🏷️ Categories & Budgets
Create custom categories for income and expenses with optional budget limits to help control spending.

## Tech Stack

- **HTML5** - Semantic markup
- **CSS3** - Custom styling with responsive design
- **Vanilla JavaScript** - No frameworks, pure JS
- **LocalStorage** - Client-side data persistence
- **Google Fonts** - Lora and Roboto typefaces

## Getting Started

### Prerequisites

- A modern web browser (Chrome, Firefox, Safari, Edge)
- No server or build process required

### Installation

1. Clone this repository:
   ```bash
   git clone <repository-url>
   cd finora
   ```

2. Open `index.html` in your web browser:
   ```bash
   # On macOS
   open index.html
   
   # On Windows
   start index.html
   
   # On Linux
   xdg-open index.html
   ```

Alternatively, serve the files using a local development server:

```bash
# Using Python 3
python3 -m http.server 8000

# Using Node.js (npx)
npx serve .
```

Then navigate to `http://localhost:8000` in your browser.

## Usage

### Adding Transactions
1. Navigate to **Monthly Planner**
2. Click "Add Income" or "Add Expense"
3. Fill in the amount, category, and optional notes
4. Enable "Recurring" for transactions that repeat monthly

### Managing Loans
1. Go to **Loan Tracker**
2. Add loans you've given or taken
3. Track repayment status and due dates
4. Mark loans as settled when paid

### Setting Up EMIs
1. Navigate to **EMI Tracker**
2. Add new EMI with name, amount, and due day
3. Set the number of months remaining
4. Track payments month by month

### Creating Savings Goals
1. Go to **Saving Goals**
2. Create a goal with a target amount and deadline
3. Add contributions as you save
4. Monitor your progress visually

## Data Storage

All your data is stored locally in your browser's **LocalStorage**. This means:

- ✅ Your data stays private on your device
- ✅ No account or sign-up required
- ✅ Works offline after initial load
- ⚠️ Clearing browser data will delete your records
- ⚠️ Data is not synced across devices

### Export/Import (Coming Soon)
Future versions may include data export/import functionality for backup purposes.

## Project Structure

```
finora/
├── index.html      # Main HTML structure
├── styles.css      # All CSS styles
├── app.js          # Application logic
└── README.md       # This file
```

## Browser Support

- Chrome (recommended)
- Firefox
- Safari
- Edge

## Contributing

Contributions are welcome! Feel free to:

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Submit a pull request

## License

This project is open source and available under the [MIT License](LICENSE).

## Acknowledgments

- Font families: [Lora](https://fonts.google.com/specimen/Lora) and [Roboto](https://fonts.google.com/specimen/Roboto) from Google Fonts
- Built with vanilla JavaScript for simplicity and performance

---

**Finora** - Take control of your personal finances today!
