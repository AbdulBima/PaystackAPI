require("dotenv").config();
const express = require("express");
const axios = require("axios");
const cors = require("cors");
const app = express();
const port = process.env.PORT;

const FRONTEND = process.env.FRONTEND;
const corsOptions = {
	origin: FRONTEND,
	optionSuccessStatus: 200,
};
// Paystack API key (replace with your actual Paystack API key)
const paystackSecretKey = process.env.PAYSTAC_KEY;


app.use(express.json()); // Middleware for parsing JSON


app.use(cors());

app.post("/api/initiate-payment", async (req, res) => {
	try {
		const { amount, email, metadata } = req.body || {};


		// Paystack API endpoint for initializing a transaction
		const paystackInitiateUrl =
			"https://api.paystack.co/transaction/initialize";

		// Make request to Paystack to initialize the transaction
		const paystackResponse = await axios.post(
			paystackInitiateUrl,
			{
				email,
				amount,
				metadata,
			},
			{
				headers: {
					Authorization: `Bearer ${paystackSecretKey}`,
					"Content-Type": "application/json",
				},
			}
		);

		const authorizationUrl =
			paystackResponse.data.data.authorization_url;

		// Respond with the authorization URL to the frontend
		res.json({ authorization_url: authorizationUrl });
	} catch (error) {
		console.error("Error initiating payment:", error);
		// Handle error and respond with an appropriate status
		res.status(500).json({
			error: "Internal Server Error",
		});
	}
});


// Paystack Webhook endpoint
app.post("/paystack-webhook", async (req, res) => {
  try {
    // Verify Paystack signature 

    // Extract necessary data from Paystack webhook event
    const webhookResponse = req.body;
    console.log(webhookResponse);

    // Extract metadata from webhook response
    const metadata = webhookResponse.data.metadata;

		console.log(metadata);

    if (!metadata || !metadata.custom_fields) {
      console.error("Metadata or custom_fields is missing in Paystack webhook payload.");
      return res.status(400).json({ status: "error", message: "Invalid Paystack webhook payload." });
    }

    // Find the custom field with variable_name "cart_products"
    const cartProductsField = metadata.custom_fields.find(field => field.variable_name === "cart_products");

    if (!cartProductsField) {
      console.error("Cart products field is missing in Paystack webhook payload.");
      return res.status(400).json({ status: "error", message: "Cart products field is required." });
    }

    // Parse the cart_products value (assuming it was stringified JSON)
    const cartProducts = JSON.parse(cartProductsField.value);

    // Extract other necessary data from Paystack webhook event
    const customerEmail = webhookResponse.data.customer.email;
    const amount = webhookResponse.data.amount;

    // Make a post request to the order endpoint with the correct content type
    const orderResponse = await axios.post(
      "https://backendv2-smz4.onrender.com/api/order/",
      {
        orderer: customerEmail,
        order: metadata,
      },
      {
        headers: {
          'Content-Type': 'application/json',
        },
      }
    );

    // Check the order 
    console.log("Order response:", orderResponse.data);

    // Acknowledge receipt of Paystack webhook event
    res.json({ status: "success" });
  } catch (error) {
    console.error("Error handling Paystack webhook:", error);
    res.status(500).json({ status: "error" });
  }
});




app.listen(port, () => {
	console.log(
		`Server is running at http://localhost:${port}`
	);
});
