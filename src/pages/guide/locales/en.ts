export const en = {
  pageTitle: 'User Guide',
  tocTitle: 'Table of Contents',
  adminBadge: 'Admin',
  memberBadge: 'Member',
  tipLabel: 'Tip',
  noteLabel: 'Note',
  shortcutLabel: 'Shortcut',
  screenshotPlaceholder: '[Screenshot: %s]',
  sections: {
    gettingStarted: {
      title: 'Getting Started',
      items: [
        {
          title: 'Creating an Account',
          description:
            'Click "Sign Up" on the top-right corner. Fill in your email, password, company name, name, and nationality (required). Your account will be activated immediately after registration.',
        },
        {
          title: 'Logging In',
          description:
            'Click "Login" and enter your registered email and password. The system remembers your language preference and theme setting across sessions.',
        },
        {
          title: 'Language & Theme',
          description:
            'Use the globe icon to switch between English, Korean, Japanese, and Chinese. Use the moon/sun icon to toggle dark mode. These preferences are saved automatically.',
        },
      ],
    },
    dashboard: {
      title: 'Dashboard',
      items: [
        {
          title: 'Welcome Banner',
          description: 'Displays your name, role, and a quick action button to create a new quote.',
        },
        {
          title: 'Recent Quotes',
          description:
            'Shows your most recent saved quotes with route, carrier, and total price at a glance. Click "View All" to access the full quote history.',
        },
        {
          title: 'Weather Widget',
          description:
            'Real-time weather conditions across 47 global ports and airports. Weather disruptions can affect shipping schedules.',
          adminOnly: true,
        },
        {
          title: 'Exchange Rate Widget',
          description:
            'Live exchange rates for USD, EUR, JPY, CNY, GBP, and SGD against KRW. Rates auto-refresh every 5 minutes.',
          adminOnly: true,
        },
        {
          title: 'Currency Calculator',
          description:
            'Quick currency conversion tool on the sidebar. Select currencies and enter an amount to convert.',
          adminOnly: true,
        },
      ],
    },
    quoteCalculator: {
      title: 'Quote Calculator',
      items: [
        {
          title: '① Route & Delivery Terms',
          description:
            'Select origin country, destination country, shipping zone, and delivery mode (Door-to-Door or Door-to-Airport). Enter the destination zip code for accurate pricing.',
        },
        {
          title: '② Cargo Details',
          description:
            'Enter the number of boxes, dimensions (L x W x H in cm), and actual weight (kg). The system automatically calculates volumetric weight and applies packing adjustments (+10/+10/+15 cm).',
        },
        {
          title: '③ Additional Services',
          description:
            'Configure Seoul pickup costs, review system-applied surcharges (AHS, large package, etc.), and add manual surcharges if needed. DHL now supports 6 additional add-ons including EMG, TSD, NSC, MWB, LBI, and LBM.',
        },
        {
          title: 'Special Packing Info',
          description:
            'Selecting WOODEN_BOX, SKID, or VACUUM packing shows a detailed cost panel: material cost (surface area × ₩15,000/m²), labor (₩50,000/box, ₩75,000 vacuum), fumigation (₩30,000 fixed), and dimension/weight impact. AHS auto-detect warning is also shown.',
          adminOnly: true,
        },
        {
          title: 'UPS Surge Fee & EAS/RAS',
          description:
            'For Middle East/Israel destinations, UPS Surge Fee (SGF) is auto-calculated. When entering a ZIP code, the system checks 86 countries and 39,876 postal ranges to detect Extended/Remote Area surcharges with one-click apply.',
        },
        {
          title: '④ Financial Settings',
          description:
            'Review applied exchange rates and FSC percentages. The system uses live rates but allows admin overrides. Express shipments (UPS/DHL/FedEx) use DAP incoterm only.',
          adminOnly: true,
        },
        {
          title: 'Results & Comparison',
          description:
            'View side-by-side carrier comparison cards showing UPS, DHL, and FedEx rates. Each card breaks down origin costs, freight, destination charges, and final price.',
        },
      ],
    },
    savingQuotes: {
      title: 'Saving Quotes',
      items: [
        {
          title: 'Save Button',
          description:
            'Click "Save Quote" after calculating. The system generates a unique reference number (SQ-YYYY-NNNN) for tracking.',
        },
        {
          title: 'Adding Notes',
          description:
            'Add internal notes or customer-specific instructions when saving. These notes are visible in the quote detail view.',
        },
        {
          title: 'Slack Notification',
          description:
            'When a member saves a quote, an automatic Slack notification is sent to the team channel. This helps admins track member activity in real-time.',
        },
        {
          title: 'Quote Validity',
          description:
            'Saved quotes have a validity period with color-coded indicators: green (>3 days), yellow (1–3 days), red (expired). Surcharge changes may also flag a quote for re-verification.',
        },
      ],
    },
    pdfExport: {
      title: 'PDF Export',
      items: [
        {
          title: 'Generating PDF',
          description:
            'Click "Download PDF" on any saved quote to generate a professional quote document. The PDF includes route details, cost breakdown, disclaimers in Korean and English, and the rate date.',
        },
        {
          title: 'PDF Contents',
          description:
            'The generated PDF includes: company header, reference number, origin/destination, itemized cost breakdown, packing type with cost sub-breakdown (material, labor, fumigation), carrier add-on details (SGF, EXT, RMT, etc.), applied margin, final price in KRW and USD, and validity disclaimers.',
        },
      ],
    },
    quoteHistory: {
      title: 'Quote History',
      items: [
        {
          title: 'Searching Quotes',
          description:
            'Use the search bar to find quotes by reference number, destination country, or notes. The search works across all text fields.',
        },
        {
          title: 'Filtering',
          description:
            'Filter quotes by destination country, date range, or status (confirmed/expired). Combine filters with search for precise results.',
        },
        {
          title: 'Quote Detail View',
          description:
            'Click on any quote row to open the detail modal. View full cost breakdown, applied margin rules, notes, and surcharge status.',
        },
        {
          title: 'CSV Export',
          description:
            'Export your quote history as a CSV file for external analysis. The export includes all visible columns and supports up to 10,000 records.',
        },
      ],
    },
    accountSettings: {
      title: 'Account Settings',
      items: [
        {
          title: 'Changing Password',
          description:
            'Click the gear icon in the header to open Account Settings. Enter your current password, then your new password (minimum 6 characters) and confirm it.',
        },
        {
          title: 'Theme Preference',
          description:
            'Toggle between light and dark mode using the sun/moon icon in the header. Your preference is saved in the browser.',
        },
        {
          title: 'Language Preference',
          description:
            'Click the globe icon to switch languages. The system supports English, Korean, Japanese, and Chinese. Your choice persists across sessions.',
        },
      ],
    },
    adminOverview: {
      title: 'Admin Panel Overview',
      items: [
        {
          title: 'Accessing Admin Panel',
          description:
            'Admin users see an "Admin Panel" link in the header. The admin view provides the same quote calculator plus additional management widgets below.',
        },
        {
          title: 'Admin Widgets',
          description:
            'The admin panel includes: Margin Rules, FSC Rates, Surcharge Management, Customer Management, User Management, Rate Table Viewer, and Audit Log.',
        },
        {
          title: 'Margin Visibility',
          description:
            'Only admin users can see the margin breakdown and pricing strategy sections in the quote results. Members see final prices only.',
        },
      ],
    },
    marginRules: {
      title: 'Margin Rules Management',
      items: [
        {
          title: 'Priority System',
          description:
            'Margin rules follow a priority-based resolution: P100 (per-user flat rate, highest priority) > P90 (per-user weight-based) > P50 (nationality-based) > P0 (default fallback). The first matching rule wins.',
        },
        {
          title: 'Creating Rules',
          description:
            'Click "Add Rule" to create a new margin rule. Specify the priority tier, target (user email or nationality), margin percentage, and optional weight range for P90 rules.',
        },
        {
          title: 'Editing & Deleting',
          description:
            'Click the edit icon to modify existing rules inline. Delete uses soft-delete to preserve audit history. All changes are logged in the Audit Log.',
        },
        {
          title: 'Rule Resolution',
          description:
            'Use the "Test Resolve" feature to see which margin rule would apply for a specific user and weight combination. Results are cached for 5 minutes.',
        },
      ],
    },
    fscManagement: {
      title: 'FSC Rate Management',
      items: [
        {
          title: 'Viewing Current Rates',
          description:
            'The FSC widget displays current fuel surcharge percentages for UPS, DHL, and FedEx, both international and domestic. Each rate shows its last update date.',
        },
        {
          title: 'Updating Rates',
          description:
            'Enter new FSC percentages and save. Changes take effect immediately for all new calculations. External verification links are provided for cross-checking with official carrier pages.',
        },
        {
          title: 'Rate Impact',
          description:
            'FSC is applied as a percentage on top of the base carrier freight rate. A change in FSC directly affects all quote calculations.',
        },
      ],
    },
    surchargeManagement: {
      title: 'Surcharge Management',
      items: [
        {
          title: 'Active Surcharges',
          description:
            'View all currently active surcharges in a table format. Each entry shows the surcharge name, carrier, type (percentage or flat), amount, and effective dates.',
        },
        {
          title: 'Adding Surcharges',
          description:
            'Use the form to add carrier-specific surcharges. Specify the carrier, surcharge name, type (percentage or flat amount), value, and optional start/end dates.',
        },
        {
          title: 'Carrier Links',
          description:
            'Quick links to official UPS, DHL, and FedEx surcharge announcement pages for verification.',
        },
        {
          title: 'Important Notice',
          description:
            'Surcharges are manually updated based on official carrier announcements. They are not auto-synced. Always verify with official pages before finalizing quotes.',
        },
      ],
    },
    customerManagement: {
      title: 'Customer Management',
      items: [
        {
          title: 'Customer List',
          description:
            'View all registered customers with their company name, contact information, and quote count badges showing activity level.',
        },
        {
          title: 'Adding Customers',
          description:
            'Create customer records with company name, contact person, email, and phone number. Customer records can be linked to saved quotes.',
        },
        {
          title: 'Customer Quotes',
          description:
            'View all quotes associated with a specific customer. This helps track customer activity and pricing history.',
        },
      ],
    },
    userManagement: {
      title: 'User Management',
      items: [
        {
          title: 'User List',
          description:
            'View all registered users with their name, email, company, nationality, network memberships, and role (admin/member).',
        },
        {
          title: 'Editing Users',
          description:
            'Click "Edit" to modify user details including role, company, nationality, and network memberships. Changes are saved immediately and logged.',
        },
        {
          title: 'Search & Filter',
          description: 'Use the search bar to find users by name, email, or company name.',
        },
      ],
    },
    rateTableViewer: {
      title: 'Rate Table Viewer',
      items: [
        {
          title: 'Viewing Rate Tables',
          description:
            'Browse carrier-specific rate tables (UPS, DHL, FedEx) in a read-only format. Tables show weight-based pricing across all shipping zones.',
        },
        {
          title: 'Zone Reference',
          description:
            'Each carrier has its own zone mapping. The viewer shows which countries belong to each zone for reference during quoting.',
        },
      ],
    },
    auditLog: {
      title: 'Audit Log',
      items: [
        {
          title: 'Viewing Audit Logs',
          description:
            'All admin actions (margin rule changes, FSC updates, surcharge modifications, user edits) are recorded with timestamp, user, action type, and details.',
        },
        {
          title: 'Search & Filter',
          description:
            'Filter audit logs by date range, action type, or user. Use the search bar to find specific entries.',
        },
        {
          title: 'Compliance',
          description:
            'The audit log provides a complete trail of all configuration changes for compliance and accountability purposes.',
        },
      ],
    },
  },
};
