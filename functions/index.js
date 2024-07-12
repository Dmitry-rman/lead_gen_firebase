/**
 * Import function triggers from their respective submodules:
 *
 * const {onCall} = require("firebase-functions/v2/https");
 * const {onDocumentWritten} = require("firebase-functions/v2/firestore");
 *
 * See a full list of supported triggers at https://firebase.google.com/docs/functions
 */

const {onRequest} = require("firebase-functions/v2/https");
const logger = require("firebase-functions/logger");

// Create and deploy your first functions
// https://firebase.google.com/docs/functions/get-started

// exports.helloWorld = onRequest((request, response) => {
//   logger.info("Hello logs!", {structuredData: true});
//   response.send("Hello from Firebase!");
// });

const FUNCTIONS_REGION = "europe-west3";
const functions = require('firebase-functions');
const admin = require("firebase-admin");
//const serviceAccount = require('./wbstat-f849a-firebase-adminsdk-iicsy-0a65023c88.json');

admin.initializeApp({
 // credential: admin.credential.cert(serviceAccount)
});

const assistant = require("./assistant");

exports.parseData = functions.region(FUNCTIONS_REGION)
.https.onCall(async (data, context) => {
    const requestData = {
        text: data.content,
        prompt: `
        I will send you text from browser with coup of organizations from Google response.
        Format and response input text as JSON array with next format:
        {
        "data": [
        {
         name: [name],
         email: [email],
         city: [city],
         address: [address],
         type: [type]
        },
        ...
        ]
        }
         Where with the following fields name (organization name),
         email (1 e-mail), city, address (organization address, do not write 2GIS or city name here), 
         type (type of activity, for example car service).
         Use Russian language in response.
        `,
        jsonFormat: true,
        logPrefix: 'http getAssistant',
        temperature: 0.2
      };
    
      try {
        const result = await assistant.getAIResponse(requestData);
        console.log(result);

        let parsedResult;
        try {
            parsedResult = JSON.parse(result);
        } catch (e) {
            return { error: result };
        }

        let organizations = parsedResult['data'];

        if ( organizations != null) {
            return { data: { data: organizations, count: organizations.length } };
        } else {
            return { error: result };
        }
      } catch (error) {
        console.error('Error in getAIText:', error);
        return { "error": "Failed to get AI text response." };
      }
});