# EIGER Order & Retur on Vercel

This project hosts the existing `index.html` on Vercel and sends all Google Apps Script calls through `/api/gas`.

## Files

- `index.html` - frontend app, now using `var URL_GAS = "/api/gas";`
- `api/gas.js` - Vercel serverless proxy to Google Apps Script
- `apps-script/code.gs` - cleaned copy of the Apps Script backend
- `.env.example` - environment variable template

## Google Apps Script setup

1. Open the Apps Script project connected to your spreadsheet.
2. Make sure `code.gs` is deployed as a Web App.
3. In Apps Script, click `Deploy` > `Manage deployments`.
4. Copy the Web App URL ending in `/exec`.
5. Use that URL as `GAS_WEB_APP_URL` in Vercel.

Recommended deployment settings:

- Execute as: `Me`
- Who has access: `Anyone`

## Local setup

1. Install the Vercel CLI if you do not have it yet:

   ```bash
   npm i -g vercel
   ```

2. Copy `.env.example` to `.env.local`.

3. Set your Apps Script URL:

   ```env
   GAS_WEB_APP_URL=https://script.google.com/macros/s/YOUR_DEPLOYMENT_ID/exec
   GAS_API_SECRET=
   ```

4. Run locally:

   ```bash
   npm run dev
   ```

5. Open the local URL printed by Vercel.

## Vercel deployment

1. Push this folder to GitHub.
2. In Vercel, click `Add New Project`.
3. Import the GitHub repository.
4. Add environment variables:

   ```env
   GAS_WEB_APP_URL=https://script.google.com/macros/s/YOUR_DEPLOYMENT_ID/exec
   GAS_API_SECRET=
   ```

5. Click `Deploy`.

## After deployment checklist

- Submit one EA/Retur form and confirm a row appears in `Orders`.
- Open admin login and test with one valid admin account.
- Change an order status and confirm it updates in the spreadsheet.
- Test on mobile.
- Confirm browser DevTools shows calls to `/api/gas`, not directly to the Apps Script URL.
