// functions/mpesaFunctions.js
const functions = require("firebase-functions");
const admin = require("firebase-admin");
const axios = require("axios");
const moment = require("moment");
const fs = require("fs");

admin.initializeApp();

// ACCESS TOKEN FUNCTION
/**
 * Get access token from M-Pesa API.
 * @return {Promise<string>} Access token
 */
async function getAccessToken() {
  // Function implementation
  const consumerKey =
  "S9uGApOZvuzVmv113sm80ykKB2GFcth1S0aNHoVdkZ8dHbdQ";
  const consumerSecret =
  "LQFyMIE1FDsOAsGI7dmkgrozQGY7A6Qf9iN1tG2AgHKu7xtAZRKEkqKn9vGGGMs7";
  const url = "https://api.safaricom.co.ke/oauth/v1/generate?grant_type=client_credentials";
  const auth = "Basic " +
  Buffer.from(consumerKey + ":" + consumerSecret).toString("base64");

  // eslint-disable-next-line no-useless-catch
  try {
    const response = await axios.get(url, {
      headers: {
        Authorization: auth,
      },
    });
    const accessToken = response.data.access_token;
    return accessToken;
  } catch (error) {
    throw error;
  }
}

// STK PUSH FUNCTION
exports.stkpush = functions.https.onRequest(async (req, res) => {
  let phoneNumber = req.body.phone;
  const accountNumber = req.body.accountNumber;
  const amount = req.body.amount;

  if (phoneNumber.startsWith("0")) {
    phoneNumber = "254" + phoneNumber.slice(1);
  }

  try {
    const accessToken = await getAccessToken();
    const url = "https://sandbox.safaricom.co.ke/mpesa/stkpush/v1/processrequest";
    const timestamp = moment().format("YYYYMMDDHHmmss");
    const password = Buffer.from("174379" +
    "bfb279f9aa9bdbcf158e97dd71a467cd2e0c893059b10f78e6b72ada1ed2c919" +
    timestamp).toString("base64");

    // eslint-disable-next-line no-unused-vars
    const response = await axios.post(url, {
      BusinessShortCode: "174379",
      Password: password,
      Timestamp: timestamp,
      TransactionType: "CustomerPayBillOnline",
      Amount: amount,
      PartyA: phoneNumber,
      PartyB: "174379",
      PhoneNumber: phoneNumber,
      CallBackURL: "https://yourfirebaseappurl.cloudfunctions.net/api/callback",
      AccountReference: accountNumber,
      TransactionDesc: "Mpesa Daraja API stk push test",
    }, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });

    res.status(200).json({
      message:
      "Request is successful done ✔✔.",
      status: true,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      message: "Request failed",
      status: false,
    });
  }
});

// STK PUSH CALLBACK FUNCTION
exports.callback = functions.https.onRequest((req, res) => {
  console.log("STK PUSH CALLBACK");
  const merchantRequestID = req.body.Body.stkCallback.MerchantRequestID;
  const checkoutRequestID = req.body.Body.stkCallback.CheckoutRequestID;
  const resultCode = req.body.Body.stkCallback.ResultCode;
  const resultDesc = req.body.Body.stkCallback.ResultDesc;
  const callbackMetadata = req.body.Body.stkCallback.CallbackMetadata;
  const amount = callbackMetadata.Item[0].Value;
  const mpesaReceiptNumber = callbackMetadata.Item[1].Value;
  const transactionDate = callbackMetadata.Item[3].Value;
  const phoneNumber = callbackMetadata.Item[4].Value;

  console.log("MerchantRequestID:", merchantRequestID);
  console.log("CheckoutRequestID:", checkoutRequestID);
  console.log("ResultCode:", resultCode);
  console.log("ResultDesc:", resultDesc);
  console.log("Amount:", amount);
  console.log("MpesaReceiptNumber:", mpesaReceiptNumber);
  console.log("TransactionDate:", transactionDate);
  console.log("PhoneNumber:", phoneNumber);

  const json = JSON.stringify(req.body);
  fs.writeFile("stkcallback.json", json, "utf8", (err) => {
    if (err) {
      return console.log(err);
    }
    console.log("STK PUSH CALLBACK STORED SUCCESSFULLY");
  });

  res.status(200).send("STK PUSH CALLBACK RECEIVED");
});
