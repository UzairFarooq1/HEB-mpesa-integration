const express = require("express");
const flash = require("connect-flash");
const router = express.Router();
router.use(flash());
const axios = require("axios");
const fs = require("fs");
const moment = require("moment");
const session = require("express-session");

router.use(
  session({
    cookie: { maxAge: 60000 },
    secret: "woot",
    resave: false,
    saveUninitialized: false,
  }),
);

// Sample API route
router.get("/api/home", (req, res) => {
  res.json({ message: "This is a sample API route." });
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
  const consumer_secret =
    "O4gWvHyp3IhaJran4F8j4Kl1qDmHoHKCG8AkAsE0GN67Dyf1TvhDoaRDBr2FGecw";
  const url =
    "https://api.safaricom.co.ke/oauth/v1/generate?grant_type=client_credentials";

  const auth =
    "Basic " +
    Buffer.from(consumer_key + ":" + consumer_secret).toString("base64");

  try {
    console.log("Requesting access token from M-Pesa...");
    const response = await axios.get(url, {
      headers: { Authorization: auth },
      timeout: 10000, // 10 second timeout
    });

    if (!response.data || !response.data.access_token) {
      console.error("Invalid access token response:", response.data);
      throw new Error(
        "Invalid response from M-Pesa API: No access token received",
      );
    }

    console.log("Access token retrieved successfully");
    return response.data.access_token;
  } catch (error) {
    console.error("Error getting access token:", {
      message: error.message,
      response: error.response?.data,
      status: error.response?.status,
      statusText: error.response?.statusText,
    });
    throw error;
  }
}

let ticketId;
let latestMpesaReceiptNumber = ""; // Variable to store the latest mpesaReceiptNumber

const RECEIPTS_INDEX_FILE = "receipts-index.json";

function normalizeReceiptCode(code) {
  return String(code || "")
    .trim()
    .toUpperCase()
    .replace(/\s/g, "");
}

function readJsonFileSafe(filePath, defaultValue = null) {
  try {
    const data = fs.readFileSync(filePath, "utf8");
    return JSON.parse(data);
  } catch {
    return defaultValue;
  }
}

function indexReceiptPayment(receiptRecord) {
  const normalized = normalizeReceiptCode(receiptRecord.mpesaReceiptNumber);
  if (!normalized) return;

  const index = readJsonFileSafe(RECEIPTS_INDEX_FILE, {});
  index[normalized] = {
    ...receiptRecord,
    mpesaReceiptNumber: normalized,
    indexedAt: new Date().toISOString(),
  };

  try {
    fs.writeFileSync(RECEIPTS_INDEX_FILE, JSON.stringify(index, null, 2));
  } catch (err) {
    console.error("Failed to index receipt:", err);
  }
}

function findPaymentByReceipt(receiptCode) {
  const normalized = normalizeReceiptCode(receiptCode);
  if (!normalized) return null;

  const index = readJsonFileSafe(RECEIPTS_INDEX_FILE, {});
  if (index[normalized]) {
    return { source: "index", ...index[normalized] };
  }

  const stkCallbacks = readJsonFileSafe("stkcallback.json", {});
  for (const key of Object.keys(stkCallbacks)) {
    const entry = stkCallbacks[key];
    if (normalizeReceiptCode(entry.mpesaReceiptNumber) === normalized) {
      if (entry.resultCode === 0 || entry.resultCode === "0") {
        return { source: "stkcallback", ...entry };
      }
    }
  }

  const single = readJsonFileSafe("stksingleCallbacks.json", null);
  if (single?.Body?.stkCallback) {
    const stk = single.Body.stkCallback;
    if (stk.ResultCode === 0 && stk.CallbackMetadata?.Item) {
      const items = stk.CallbackMetadata.Item;
      const receipt =
        items.find((item) => item.Name === "MpesaReceiptNumber")?.Value || "";
      if (normalizeReceiptCode(receipt) === normalized) {
        return {
          source: "stksingleCallbacks",
          mpesaReceiptNumber: receipt,
          amount: items.find((item) => item.Name === "Amount")?.Value,
          phoneNumber: items.find((item) => item.Name === "PhoneNumber")?.Value,
          transactionDate: items.find(
            (item) => item.Name === "TransactionDate",
          )?.Value,
          resultCode: 0,
        };
      }
    }
  }

  const paid = readJsonFileSafe("paidticketid.json", null);
  if (paid && normalizeReceiptCode(paid.mpesaReceiptNumber) === normalized) {
    return {
      source: "paidticketid",
      mpesaReceiptNumber: paid.mpesaReceiptNumber,
      ticketId: paid.ticketId,
      resultCode: 0,
    };
  }

  return null;
}

function validatePaymentAmount(payment, expectedAmount) {
  if (expectedAmount == null || expectedAmount === "") return null;

  const paidAmount = Number(payment.amount);
  const expected = Math.ceil(Number(expectedAmount));

  if (isNaN(expected) || expected <= 0) return null;
  if (isNaN(paidAmount) || paidAmount <= 0) return null;

  if (paidAmount < expected) {
    return `Payment amount (Ksh ${paidAmount}) is less than order total (Ksh ${expected})`;
  }

  return null;
}

router.post("/api/stkpush", (req, res) => {
  /* ========== ORIGINAL CODE (BEFORE EDITING) - START ==========
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
          Amount: "1",  // <-- WAS HARDCODED TO "1"
          PartyA: phoneNumber,
          PartyB: "4326998",
          PhoneNumber: phoneNumber,
          CallBackURL: "https://heb-events-url.loca.lt/api/callback",  // <-- OLD CALLBACK URL
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
    .catch(console.log);  // <-- NO ERROR HANDLING, JUST LOGGED TO CONSOLE
  ========== ORIGINAL CODE (BEFORE EDITING) - END ========== */

  // ========== NEW CODE (AFTER EDITING) - START ==========
  try {
    let phoneNumber = req.body.phone;
    let amount = req.body.amount;
    const event = req.body.event || "Event Payment";
    ticketId = req.body.ticketId || `TICKET-${Date.now()}`;

    console.log("Received STK Push Request:", {
      phone: phoneNumber,
      amount: amount,
      event: event,
      body: req.body,
    });

    // Validate required fields
    if (!phoneNumber) {
      return res.status(400).json({
        msg: "Phone number is required",
        status: false,
      });
    }

    // Clean phone number - remove spaces, dashes, and other characters
    phoneNumber = phoneNumber.toString().replace(/\D/g, "");

    // Validate phone number format
    if (phoneNumber.length < 9 || phoneNumber.length > 12) {
      return res.status(400).json({
        msg: "Invalid phone number format",
        status: false,
      });
    }

    // Format phone number to Kenyan format (254XXXXXXXXX)
    if (phoneNumber.startsWith("0")) {
      phoneNumber = "254" + phoneNumber.slice(1);
    } else if (phoneNumber.startsWith("254")) {
      // Already in correct format
    } else if (phoneNumber.length === 9) {
      phoneNumber = "254" + phoneNumber;
    } else {
      return res.status(400).json({
        msg: "Invalid phone number format. Use format: 0712345678 or 254712345678",
        status: false,
      });
    }

    // Convert amount to number if it's a string
    if (typeof amount === "string") {
      amount = parseFloat(amount);
    }

    if (!amount || isNaN(amount) || amount <= 0) {
      return res.status(400).json({
        msg: "Valid amount is required (must be greater than 0)",
        status: false,
      });
    }

    // Ensure amount is rounded to nearest whole number (M-Pesa doesn't accept decimals)
    // Round up to ensure customer pays at least the discounted amount
    const roundedAmount = Math.ceil(amount);

    // M-Pesa minimum amount is 1 KSH
    if (roundedAmount < 1) {
      return res.status(400).json({
        msg: "Amount must be at least 1 KSH",
        status: false,
      });
    }

    console.log("Processing STK Push:", {
      phoneNumber,
      originalAmount: amount,
      roundedAmount: roundedAmount,
      ticketId,
      event,
    });

    getAccessToken()
      .then((accessToken) => {
        if (!accessToken) {
          throw new Error("Access token is empty or undefined");
        }

        const url =
          "https://api.safaricom.co.ke/mpesa/stkpush/v1/processrequest";
        const auth = "Bearer " + accessToken;
        const timestamp = moment().format("YYYYMMDDHHmmss");
        const password = Buffer.from(
          "4326998" +
            "a2153b2f0735e3b2256ab3ccfdbebe38a11756ed910cb7bd2c6f8c106839bac8" +
            timestamp,
        ).toString("base64");

        // Convert amount to string (M-Pesa requires string format)
        const amountString = roundedAmount.toString();

        console.log("Sending STK Push to M-Pesa:", {
          phoneNumber,
          amount: amountString,
          timestamp,
          callbackURL: "https://mpesa-backend-api.vercel.app/api/callback",
        });

        axios
          .post(
            url,
            {
              BusinessShortCode: "4326998",
              Password: password,
              Timestamp: timestamp,
              TransactionType: "CustomerPayBillOnline",
              Amount: amountString, // <-- NOW USES ACTUAL AMOUNT FROM REQUEST
              PartyA: phoneNumber,
              PartyB: "4326998",
              PhoneNumber: phoneNumber,
              CallBackURL: "https://mpesa-backend-api.vercel.app/api/callback", // <-- UPDATED CALLBACK URL
              AccountReference: ticketId,
              TransactionDesc: event, // <-- NOW USES EVENT NAME FROM REQUEST
            },
            { headers: { Authorization: auth } },
          )
          .then((response) => {
            console.log("STK Push Response from M-Pesa:", response.data);

            // Check if M-Pesa returned an error
            if (
              response.data &&
              response.data.ResponseCode &&
              response.data.ResponseCode !== "0"
            ) {
              const errorMsg =
                response.data.CustomerMessage ||
                response.data.errorMessage ||
                "M-Pesa request failed";
              console.error("M-Pesa API Error:", {
                ResponseCode: response.data.ResponseCode,
                CustomerMessage: response.data.CustomerMessage,
                errorMessage: response.data.errorMessage,
              });
              return res.status(400).json({
                msg: errorMsg,
                status: false,
                mpesaResponse: response.data,
              });
            }

            res.status(200).json({
              msg: "Request is successful done ✔✔. Please enter mpesa pin to complete the transaction",
              status: true,
              data: response.data,
            });
          })
          .catch((error) => {
            console.error("STK Push Error Details:", {
              message: error.message,
              response: error.response?.data,
              status: error.response?.status,
              statusText: error.response?.statusText,
              stack: error.stack,
            });

            const errorMessage =
              error.response?.data?.errorMessage ||
              error.response?.data?.CustomerMessage ||
              error.message ||
              "Request failed";

            res.status(500).json({
              msg: errorMessage,
              status: false,
              error: error.response?.data || error.message,
              details:
                process.env.NODE_ENV === "development"
                  ? error.stack
                  : undefined,
            });
          });
      })
      .catch((error) => {
        console.error("Access Token Error Details:", {
          message: error.message,
          response: error.response?.data,
          status: error.response?.status,
          statusText: error.response?.statusText,
          stack: error.stack,
        });

        const errorMessage =
          error.response?.data?.errorMessage ||
          error.message ||
          "Failed to get access token from M-Pesa";

        res.status(500).json({
          msg: errorMessage,
          status: false,
          error: error.response?.data || error.message,
          details:
            process.env.NODE_ENV === "development" ? error.stack : undefined,
        });
      });
  } catch (error) {
    console.error("STK Push Handler Error:", error);
    res.status(500).json({
      msg: "Internal server error",
      status: false,
      error: error.message,
    });
  }
  // ========== NEW CODE (AFTER EDITING) - END ==========
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
          let existingData = {};
          if (!err && data) {
            try {
              existingData = JSON.parse(data);
            } catch (error) {
              existingData = {};
            }
          }

          const paymentRecord = {
            checkoutRequestID,
            resultCode,
            resultDesc,
            amount,
            mpesaReceiptNumber,
            transactionDate,
            phoneNumber,
            ticketId,
          };

          existingData[merchantRequestID] = paymentRecord;

          if (resultCode === 0) {
            indexReceiptPayment(paymentRecord);
          }

          fs.writeFile(
            "stkcallback.json",
            JSON.stringify(existingData, null, 2),
            "utf8",
            (err) => {
              if (err) {
                return console.log(err);
              }
              const json = JSON.stringify(req.body);
              fs.writeFile("stksingleCallbacks.json", json, "utf8", (err) => {
                if (err) {
                  return console.log(err);
                }
                console.log("STK PUSH CALLBACK STORED SUCCESSFULLY");

                fs.writeFile(
                  "paidticketid.json",
                  JSON.stringify({ ticketId, mpesaReceiptNumber }, null, 2),
                  "utf8",
                  (err) => {
                    if (err) {
                      return console.log(err);
                    }
                    console.log("STK PUSH CALLBACK STORED SUCCESSFULLY");
                    res
                      .status(200)
                      .json({ message: "Callback processed successfully" });
                  },
                );
              });
            },
          );
        });
      } else {
        console.log("CallbackMetadata Item array is empty or undefined");
        res
          .status(400)
          .json({
            message: "CallbackMetadata Item array is empty or undefined",
          });
      }
    } else {
      console.log("CallbackMetadata is empty or undefined");
      res
        .status(400)
        .json({ message: "CallbackMetadata is empty or undefined" });
    }
  } else {
    console.log("stkCallback not found in request body");
    res.status(400).json({ message: "stkCallback not found in request body" });
  }
});

router.get("/api/paidtickets", (req, res) => {
  try {
    const paidTicket = fs.readFileSync("paidticketid.json", "utf8");
    res.json(JSON.parse(paidTicket));
  } catch (error) {
    console.error("Error reading paidticketid.json:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

/* ========== ORIGINAL CODE - THIS ENDPOINT DID NOT EXIST ==========
   The frontend was calling /paymentStatus but this endpoint was missing,
   which would have caused a 404 error. This is a NEW endpoint added.
   ========== END OF ORIGINAL CODE NOTE ========== */

// Verify payment by M-Pesa receipt code (e.g. after page reload or missed callback poll)
router.post("/api/verify-receipt", (req, res) => {
  try {
    const receiptCode = req.body.receiptCode || req.body.receipt;
    const expectedAmount = req.body.amount;

    if (!receiptCode) {
      return res.status(400).json({
        status: false,
        msg: "M-Pesa receipt code is required",
      });
    }

    const normalized = normalizeReceiptCode(receiptCode);
    if (normalized.length < 8 || normalized.length > 12) {
      return res.status(400).json({
        status: false,
        msg: "Invalid receipt code. Use the code from your M-Pesa confirmation SMS (e.g. QJK1ABC2DE).",
      });
    }

    const payment = findPaymentByReceipt(normalized);
    if (!payment) {
      return res.status(404).json({
        status: false,
        msg: "No payment found for this receipt code. Check the code from your M-Pesa SMS and try again in a minute if you just paid.",
      });
    }

    if (
      payment.resultCode != null &&
      payment.resultCode !== 0 &&
      payment.resultCode !== "0"
    ) {
      return res.status(400).json({
        status: false,
        msg: "This M-Pesa transaction was not successful",
      });
    }

    const amountError = validatePaymentAmount(payment, expectedAmount);
    if (amountError) {
      return res.status(400).json({
        status: false,
        msg: amountError,
      });
    }

    return res.json({
      status: true,
      message: "Successful Payment",
      mpesaReceipt: payment.mpesaReceiptNumber,
      amount: payment.amount,
      phoneNumber: payment.phoneNumber,
      transactionDate: payment.transactionDate,
    });
  } catch (error) {
    console.error("Verify receipt error:", error);
    res.status(500).json({
      status: false,
      msg: "Failed to verify receipt. Please try again.",
    });
  }
});

// Payment Status endpoint - NEW ENDPOINT ADDED
router.get("/paymentStatus", (req, res) => {
  try {
    const receiptQuery = req.query.receipt;
    if (receiptQuery) {
      const payment = findPaymentByReceipt(receiptQuery);
      if (
        payment &&
        (payment.resultCode === 0 ||
          payment.resultCode === "0" ||
          payment.resultCode == null)
      ) {
        return res.json({
          message: "Successful Payment",
          mpesaReceipt: payment.mpesaReceiptNumber,
          status: "success",
        });
      }
      return res.json({
        message: "Payment not found for this receipt",
        status: "not_found",
      });
    }

    // Try to read the latest payment status from stksingleCallbacks.json
    const callbackData = fs.readFileSync("stksingleCallbacks.json", "utf8");
    const callback = JSON.parse(callbackData);

    if (callback && callback.Body && callback.Body.stkCallback) {
      const stkCallback = callback.Body.stkCallback;
      const resultCode = stkCallback.ResultCode;

      // ResultCode 0 means successful payment
      if (resultCode === 0 && stkCallback.CallbackMetadata) {
        const items = stkCallback.CallbackMetadata.Item;
        const mpesaReceipt =
          items.find((item) => item.Name === "MpesaReceiptNumber")?.Value || "";

        return res.json({
          message: "Successful Payment",
          mpesaReceipt: mpesaReceipt,
          status: "success",
        });
      } else {
        return res.json({
          message: "Payment Pending",
          status: "pending",
        });
      }
    }

    // If no callback data found, check paidticketid.json
    try {
      const paidTicket = fs.readFileSync("paidticketid.json", "utf8");
      const paidData = JSON.parse(paidTicket);

      if (paidData && paidData.mpesaReceiptNumber) {
        return res.json({
          message: "Successful Payment",
          mpesaReceipt: paidData.mpesaReceiptNumber,
          status: "success",
        });
      }
    } catch (err) {
      // File doesn't exist or is invalid
    }

    res.json({
      message: "Payment Pending",
      status: "pending",
    });
  } catch (error) {
    console.error("Error reading payment status:", error);
    // If file doesn't exist, payment is still pending
    res.json({
      message: "Payment Pending",
      status: "pending",
    });
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
