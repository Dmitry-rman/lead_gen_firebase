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
const messages = require("./messages");

exports.parseData = functions.region(FUNCTIONS_REGION)
.https.onCall(async (data, context) => {
    const requestData = {
        text: data.content,
        gptModel: 'gpt-4o-mini',
        prompt: `
        I will send you text from browser with coup of organizations from Google response.
        Format and response input text as JSON array with next format:
        {
        "data": [
        {
         name: [name],
         email: [email],
         phone: [phone],
         city: [city],
         address: [address],
         type: [type]
        },
        ...
        ]
        }
         Where with the following fields name (organization name),
         email (1 e-mail), city, address (organization address, do not write 2GIS or city name here), 
         type (type of activity, for example car service), phone you found.
         Phone and email are optional fields if its values are exists.
         Use Russian language in response.
        `,
        jsonFormat: true,
        temperature: 0.2
      };
    
      try {
        const result = await assistant.getAIResponse(requestData);
        console.log(result);

        const site = data.site;
        const query = data.query;

        let parsedResult;
        try {
            parsedResult = JSON.parse(result);
        } catch (e) {
            return { error: result };
        }

        let organizations = parsedResult['data'];

        if ( organizations != null) {
            // Добавляем поля site и query к каждому элементу
            organizations = organizations.map(org => ({
                ...org,
                site: site,
                query: query
            }));
            return { data: { data: organizations, count: organizations.length } };
        } else {
            return { error: result };
        }
      } catch (error) {
        console.error('Error in getAIText:', error);
        return { "error": "Failed to get AI text response." };
      }
});

exports.getMessage = functions.region(FUNCTIONS_REGION)
.https.onCall(async (data, context) => {
    const requestData = {
        ...data,
        logPrefix: 'http getAssistant',
        temperature: 0.5
    };
   return await messages.getMessage(requestData);
});

exports.createChat =  functions.region(FUNCTIONS_REGION)
.https.onCall(async (data, context) => {
    return await messages.createChat(data);
});

exports.deleteChat =  functions.region(FUNCTIONS_REGION)
.https.onCall(async (data, context) => {
    return await messages.deleteChat(data);
});