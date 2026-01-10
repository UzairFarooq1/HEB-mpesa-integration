# M-Pesa Backend Deployment Guide

## Changes Made

1. **Fixed hardcoded amount**: Changed from `"1"` to use actual amount from request
2. **Added error handling**: Proper error responses when access token fails
3. **Added input validation**: Validates phone number and amount
4. **Added `/paymentStatus` endpoint**: New endpoint for checking payment status
5. **Updated callback URL**: Changed to use deployed backend URL
6. **Added moment dependency**: Added missing moment package

## Deployment to Vercel

### Option 1: Deploy via Vercel CLI

1. Install Vercel CLI (if not already installed):
   ```bash
   npm install -g vercel
   ```

2. Navigate to the mpesa-backend directory:
   ```bash
   cd mpesa-backend
   ```

3. Install dependencies:
   ```bash
   npm install
   ```

4. Deploy to Vercel:
   ```bash
   vercel
   ```
   
   Follow the prompts:
   - Link to existing project? **Yes** (if you already have a Vercel project)
   - Project name: Use your existing project name or create new
   - Directory: `./` (current directory)

5. For production deployment:
   ```bash
   vercel --prod
   ```

### Option 2: Deploy via GitHub

1. Push your code to GitHub (if not already done)

2. Go to [Vercel Dashboard](https://vercel.com/dashboard)

3. Import your repository

4. Set the root directory to `mpesa-backend`

5. Configure build settings:
   - Build Command: (leave empty or `npm install`)
   - Output Directory: (leave empty)
   - Install Command: `npm install`

6. Deploy

### Important Notes

- The backend URL should be: `https://mpesa-backend-api.vercel.app` (or your custom domain)
- Make sure the callback URL in `api.js` matches your deployed backend URL
- File system writes (like `stkcallback.json`) may not persist on Vercel serverless functions - consider using a database instead for production

## Testing After Deployment

1. Test the `/api/stkpush` endpoint:
   ```bash
   curl -X POST https://mpesa-backend-api.vercel.app/api/stkpush \
     -H "Content-Type: application/json" \
     -d '{"phone": "254712345678", "amount": 100, "event": "Test Event"}'
   ```

2. Test the `/paymentStatus` endpoint:
   ```bash
   curl https://mpesa-backend-api.vercel.app/paymentStatus
   ```

## Troubleshooting

If you get a 500 error:
1. Check Vercel function logs in the dashboard
2. Ensure `moment` package is installed (check package.json)
3. Verify the callback URL is accessible
4. Check that M-Pesa API credentials are correct
