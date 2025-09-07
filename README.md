# Mechanic Hours - Time Tracking App

A mobile-first Progressive Web App (PWA) designed for independent mechanics and small workshops to track billable hours and generate invoices.

## Features

- **Mobile-First Design**: Optimized for smartphones and tablets
- **Time Tracking**: Start/stop timers with automatic time calculation
- **Client Management**: Add and manage clients with hourly rates
- **Task Management**: Create reusable tasks for each client
- **Entry Logging**: View, edit, and filter completed time entries
- **Invoice Generation**: Create professional invoices with line items
- **Offline Support**: Works without internet connection
- **PWA Capabilities**: Install on mobile devices like a native app
- **Export Options**: Print invoices or export as CSV

## Technology Stack

- **Frontend**: React 18 with Hooks
- **Styling**: TailwindCSS for responsive design
- **Storage**: localStorage for offline-first data persistence
- **PWA**: Service Worker for offline capabilities
- **PDF Generation**: Browser print-to-PDF support
- **CSV Export**: Client-side data export

## Installation

1. Clone the repository:
   ```bash
   git clone <repository-url>
   cd CrickTime
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Start the development server:
   ```bash
   npm start
   ```

4. Open [http://localhost:3000](http://localhost:3000) in your browser

## Building for Production

```bash
npm run build
```

The build folder will contain the production-ready files that can be deployed to any static hosting service.

## Deployment

This app can be deployed to:
- Netlify (recommended)
- Vercel
- GitHub Pages
- Any static hosting service

## Data Storage

The app uses localStorage for data persistence, making it:
- **Offline-first**: Works without internet connection
- **Private**: Data stays on the user's device
- **Fast**: No network requests for data operations

## Browser Support

- Modern browsers with ES6+ support
- Mobile browsers (iOS Safari, Chrome Mobile, etc.)
- Desktop browsers (Chrome, Firefox, Safari, Edge)

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly on mobile devices
5. Submit a pull request

## License

MIT License - see LICENSE file for details

## Support

For support and documentation, visit [www.context7.com](https://www.context7.com)

## Development Guidelines

- Follow mobile-first design principles
- Ensure touch targets are at least 44px
- Test on actual mobile devices
- Maintain offline functionality
- Keep the UI simple and intuitive
- Follow accessibility best practices

## Future Enhancements

- Google Drive integration for cloud backup
- Multi-device sync with cloud database
- Photo attachments for work entries
- Parts and materials tracking
- Advanced reporting and analytics
- Push notifications for timer reminders
