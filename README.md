# ResumeLite — lightweight resume builder MVP

A small Next.js app for checking that the GitHub → Hostinger deployment flow works.

## Features
- Editable resume fields
- Instant live preview
- Responsive layout
- Browser Print / Save as PDF
- No database, account system, or payment integration yet

## Requirements
- Node.js 18.17+ (Node.js 20 LTS recommended)
- npm

## Run locally
```bash
npm install
npm run dev
```
Open http://localhost:3000.

## Production check
```bash
npm run build
npm start
```

## Deploy
Push this project to a GitHub repository. In Hostinger, connect the repository and the `main` branch. Use:
- Build command: `npm run build`
- Start command: `npm run start`
- Node.js: 20 LTS if available

The app does not need environment variables for this demo.

## Important
This is a functionality/deployment test only. It is not a production SaaS yet: there is no login, saved-resume database, subscription system, or WooCommerce payment verification.
