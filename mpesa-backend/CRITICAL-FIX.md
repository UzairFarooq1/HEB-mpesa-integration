# Critical Fix for 500 Error

## Problem
You're getting a 500 Internal Server Error when trying to initiate M-Pesa payment. The error occurs because:

1. **Backend code not deployed** - The fixes are in your local code but NOT deployed to Vercel
2. **Decimal amounts** - Promo codes create decimal amounts (e.g., 1009.80) which need proper handling
3. **Missing error details** - Hard to debug without detailed error messages

## What I've Fixed

### 1. Improved Amount Handling
- ✅ Properly rounds decimal amounts using `Math.ceil()`
- ✅ Validates minimum amount (1 KSH)
- ✅ Converts to string format required by M-Pesa

### 2. Enhanced Error Handling
- ✅ Detailed error logging for debugging
- ✅ Proper error messages returned to frontend
- ✅ Handles M-Pesa API errors correctly
- ✅ Validates access token before use

### 3. Better Phone Number Validation
- ✅ Cleans phone numbers (removes spaces, dashes)
- ✅ Validates format and length
- ✅ Converts to Kenyan format (254XXXXXXXXX)

### 4. Improved Logging
- ✅ Logs all request details
- ✅ Logs M-Pesa API responses
- ✅ Logs error details for debugging

## ⚠️ CRITICAL: Deploy to Vercel NOW

**The backend MUST be deployed for these fixes to work!**

### Quick Deploy Steps:

1. **Navigate to backend directory:**
   ```bash
   cd mpesa-backend
   ```

2. **Install dependencies (if not done):**
   ```bash
   npm install
   ```

3. **Deploy to Vercel:**
   ```bash
   # If you have Vercel CLI installed:
   vercel --prod
   
   # OR if not installed:
   npx vercel --prod
   ```

4. **Follow the prompts:**
   - Link to existing project? **Yes**
   - Select your existing project: `mpesa-backend-api`
   - Deploy? **Yes**

### Alternative: Deploy via GitHub

1. Commit and push your changes:
   ```bash
   git add .
   git commit -m "Fix M-Pesa 500 error - improve error handling and amount processing"
   git push
   ```

2. Vercel will auto-deploy if connected to your repo

## Testing After Deployment

1. **Check deployment status:**
   - Go to Vercel Dashboard
   - Check if deployment succeeded
   - View function logs if there are errors

2. **Test the endpoint:**
   ```bash
   curl -X POST https://mpesa-backend-api.vercel.app/api/stkpush \
     -H "Content-Type: application/json" \
     -d '{"phone": "254712345678", "amount": 1009.80, "event": "Test Event"}'
   ```

3. **Check browser console:**
   - You should now see detailed error messages if something fails
   - Look for "Processing STK Push" log messages

## What to Check if Still Getting 500 Error

After deployment, if you still get a 500 error:

1. **Check Vercel Function Logs:**
   - Go to Vercel Dashboard → Your Project → Functions → View Logs
   - Look for error messages and stack traces
   - The logs will show exactly what's failing

2. **Common Issues:**
   - **M-Pesa credentials expired** - Check if consumer key/secret are still valid
   - **Callback URL not accessible** - Ensure callback endpoint is working
   - **Phone number format** - Must be 254XXXXXXXXX format
   - **Amount too low** - Must be at least 1 KSH

3. **Check Browser Console:**
   - Look for detailed error messages
   - The frontend now shows backend error messages

## Expected Behavior After Fix

✅ **Success Case:**
- Request sent to backend
- Backend processes amount (rounds decimals)
- M-Pesa API called successfully
- STK push prompt appears on phone
- Backend returns success message

❌ **Error Case (with better messages):**
- Request sent to backend
- Backend validates input
- If error occurs, detailed message returned
- Frontend shows specific error (not generic "Failed to initiate payment")

## Files Changed

- `mpesa-backend/api.js` - Enhanced error handling and amount processing
- `src/components/Checkout/CheckoutComp.jsx` - Better error display

## Next Steps

1. **DEPLOY NOW** - This is the most important step!
2. Test with a real payment
3. Check logs if errors persist
4. Report specific error messages if issues continue
