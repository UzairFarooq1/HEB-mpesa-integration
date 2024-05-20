const express = require('express');
const flash = require('connect-flash');
const router = express.Router();
router.use(flash());
const axios = require("axios");
const fs = require("fs");
const moment = require("moment");
const session = require('express-session');

router.use(session({ 
  cookie: { maxAge: 60000 }, 
  secret: 'woot',
  resave: false, 
  saveUninitialized: false 
}));

// Sample API route
router.get('/api/home', (req, res) => {
  res.json({ message: 'This is a sample API route.' });
  console.log("This is a sample API route.");
});

router.get("/api/access_token", (req, res) => {
  getAccessToken()
    .then((accessToken) => {
      res.json({ message: "😀 Your access token is " + accessToken });
    })
    .catch(console.log);
});

async function getAccessToken() {
  const consumer_key = "pM1cozMMsZMMI2vEBAh5uaAjFlOyvfGkwRxFXsdIViP7Toki";
  const consumer_secret = "O4gWvHyp3IhaJran4F8j4Kl1qDmHoHKCG8AkAsE0GN67Dyf1TvhDoaRDBr2FGecw";
  const url = "https://api.safaricom.co.ke/oauth/v1/generate?grant_type=client_credentials";

  const auth = "Basic " + Buffer.from(consumer_key + ":" + consumer_secret).toString("base64");

  try {
    const response = await axios.get(url, {
      headers: { Authorization: auth },
    });
    return response.data.access_token;
  } catch (error) {
    throw error;
  }
}

let ticketId;
let latestMpesaReceiptNumber = ""; // Variable to store the latest mpesaReceiptNumber

router.post('/api/stkpush', (req, res) => {
  let phoneNumber = req.body.phone;
  const amount = req.body.amount;
  ticketId = req.body.ticketId;

  if (phoneNumber.startsWith("0")) {
    phoneNumber = "254" + phoneNumber.slice(1);
  }

  console.log(ticketId);

  getAccessToken()
    .then((accessToken) => {
      const url = "https://api.safaricom.co.ke/mpesa/stkpush/v1/processrequest";
      const auth = "Bearer " + accessToken;
      const timestamp = moment().format("YYYYMMDDHHmmss");
      const password = Buffer.from(
        "4326998" +
        "a2153b2f0735e3b2256ab3ccfdbebe38a11756ed910cb7bd2c6f8c106839bac8" +
        timestamp
      ).toString("base64");

      axios.post(
        url,
        {
          BusinessShortCode: "4326998",
          Password: password,
          Timestamp: timestamp,
          TransactionType: "CustomerPayBillOnline",
          Amount: "1",
          PartyA: phoneNumber,
          PartyB: "4326998",
          PhoneNumber: phoneNumber,
          CallBackURL: "https://heb-events-url.loca.lt/api/callback",
          AccountReference: ticketId,
          TransactionDesc: "Mpesa Daraja API stk push test",
        },
        { headers: { Authorization: auth } }
      )
      .then((response) => {
        console.log(response.data);
        res.status(200).json({
          msg: "Request is successful done ✔✔. Please enter mpesa pin to complete the transaction",
          status: true,
        });
      })
      .catch((error) => {
        console.log(error);
        res.status(500).json({ msg: "Request failed", status: false });
      });
    })
    .catch(console.log);
});

router.post("/api/callback", (req, res) => {
  console.log("STK PUSH CALLBACK");
  console.log("Request Body:", req.body);
  console.log("ticketId:", ticketId);

  if (req.body && req.body.Body && req.body.Body.stkCallback) {
    const stkCallback = req.body.Body.stkCallback;
    const merchantRequestID = stkCallback.MerchantRequestID;
    const checkoutRequestID = stkCallback.CheckoutRequestID;
    const resultCode = stkCallback.ResultCode;
    const resultDesc = stkCallback.ResultDesc;

    if (stkCallback.CallbackMetadata) {
      const callbackMetadata = stkCallback.CallbackMetadata;

      if (callbackMetadata.Item && callbackMetadata.Item.length > 0) {
        const items = callbackMetadata.Item;
        const amount = items[0].Value;
        const mpesaReceiptNumber = items[1].Value;
        const transactionDate = items[3].Value;
        const phoneNumber = items[4].Value;

        latestMpesaReceiptNumber = mpesaReceiptNumber; // Store the latest mpesaReceiptNumber

        console.log("stkCallback:", stkCallback);
        console.log("MerchantRequestID:", merchantRequestID);
        console.log("CheckoutRequestID:", checkoutRequestID);
        console.log("ResultCode:", resultCode);
        console.log("ResultDesc:", resultDesc);
        console.log("Amount:", amount);
        console.log("MpesaReceiptNumber:", mpesaReceiptNumber);
        console.log("TransactionDate:", transactionDate);
        console.log("PhoneNumber:", phoneNumber);

        fs.readFile("stkcallback.json", "utf8", (err, data) => {
          if (err) {
            return console.log(err);
          }

          let existingData;
          try {
            existingData = JSON.parse(data);
          } catch (error) {
            existingData = {};
          }

          existingData[merchantRequestID] = {
            checkoutRequestID,
            resultCode,
            resultDesc,
            amount,
            mpesaReceiptNumber,
            transactionDate,
            phoneNumber,
          };

          fs.writeFile("stkcallback.json", JSON.stringify(existingData, null, 2), "utf8", (err) => {
            if (err) {
              return console.log(err);
            }
            const json = JSON.stringify(req.body);
            fs.writeFile("stksingleCallbacks.json", json, "utf8", (err) => {
              if (err) {
                return console.log(err);
              }
              console.log("STK PUSH CALLBACK STORED SUCCESSFULLY");

              fs.writeFile("paidticketid.json", JSON.stringify({ticketId,mpesaReceiptNumber}, null, 2), "utf8", (err) => {
                if (err) {
                  return console.log(err);
                }
                console.log("STK PUSH CALLBACK STORED SUCCESSFULLY");
                res.status(200).json({ message: "Callback processed successfully" });
              });
            });
          });
        });
      } else {
        console.log("CallbackMetadata Item array is empty or undefined");
        res.status(400).json({ message: "CallbackMetadata Item array is empty or undefined" });
      }
    } else {
      console.log("CallbackMetadata is empty or undefined");
      res.status(400).json({ message: "CallbackMetadata is empty or undefined" });
    }
  } else {
    console.log("stkCallback not found in request body");
    res.status(400).json({ message: "stkCallback not found in request body" });
  }
});

router.get('/api/paidtickets', (req, res) => {
  try {
    const paidTicket = fs.readFileSync('paidticketid.json', 'utf8');
    res.json(JSON.parse(paidTicket));
  } catch (error) {
    console.error('Error reading paidticketid.json:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});


// router.get('/api/mpesaDetails', (req, res) => {
//   try {
//     const paidTickets = fs.readFileSync('stksingleCallbacks.json', 'utf8');
//     const mpesaDetails = JSON.parse(paidTickets);

//     // Compare mpesaReceiptNumber
//     if (mpesaDetails && mpesaDetails.Body && mpesaDetails.Body.stkCallback && mpesaDetails.Body.stkCallback.CallbackMetadata) {
//       const callbackMetadata = mpesaDetails.Body.stkCallback.CallbackMetadata;
//       const items = callbackMetadata.Item;

//       if (items && items.length > 0) {
//         const mpesaReceiptNumber = items[1].Value;
//         if (mpesaReceiptNumber === latestMpesaReceiptNumber) {
//           return res.json(mpesaDetails); // Send the data to frontend if numbers match
//         }
//       }
//     }

//     res.status(404).json({ error: 'No matching data found' });
//   } catch (error) {
//     console.error('Error reading stksingleCallbacks.json:', error);
//     res.status(500).json({ error: 'Internal server error' });
//   }
// });

module.exports = router;
