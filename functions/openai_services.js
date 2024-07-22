const os = require('os');
const fs = require("fs");
const path = require("path");
const OpenAI = require("openai");
const axios = require('axios');

const openai = new OpenAI({
    apiKey: 'sk-wbexpert-firebase-service-s4VIdNTuhYRBpCQbq8TrT3BlbkFJn5PYRcDa5xfCnvb4xDRn',//wbexpert-firebase-service
    timeout: 20 * 1000, // 20 seconds (default is 10 minutes)
    maxRetries: 2, // default is 2
});

// ------------------------------------------------------------

exports.getImage =  async function(prompt) {
    return await getImage(prompt);
}

exports.getAIConversation = getAIConversation;

exports.translateText =  async function(language, text) {
    return await translateText(language, text, openai);
}

async function translateText(language, text, service) {
    try {
        const completion = await service.chat.completions.create({
        messages: [
            {"role": "system", "content": `Act as a translator. Return just a result text without quotas.`},
            {"role": "user", "content": `Translate to ${language} language: ${text}`},
        ],
        model: 'gpt-4o-mini',
        temperature: 0,
        });
        
        const CHOICES_ARRAY = completion.choices.map(choice => choice.message.content);
        return CHOICES_ARRAY[0];
    } catch  (error) {
        console.error('Error getting openAI text response:', error);
        if (error.response) {
            return { "error" : error.response.data };
        } else {
            return { "error" : error.message };
        }
    }
}

// ------------------------------------------------------------

async function getAIConversation(data) {
    const prompt = data.prompt;
    const text = data.text;
    const image = data.image;
    const history = data.history;
    const user = data.user;
    const jsonFormat = data.jsonFormat;
    const document = data.document;
    const temperature = data.temperature || 0.2;
    let modelName = 'gpt-4o-mini';
    if (data.gptModel != null) {
        modelName = data.gptModel
    }

    let messages = [
        { "role": "system", "content": prompt }
    ];

    if (history) {
        try {
            messages = [...messages, ...history];
        } catch (error) {
            console.error('Error parsing history JSON:', error);
        }
    }

    // Check if an image is provided and format message accordingly
    if (image) {
        let imageContent;

        if (image.startsWith('http://') || image.startsWith('https://')) {
            // Image is a URL
            imageContent = {
                "type": "image_url",
                "image_url": {
                    "url": image,
                    "detail": "low" // This is hypothetical; adjust detail as needed
                }
            };
        } else {
            // Image is a Base64-encoded string
            imageContent = {
                "type": "image_url",
                "image_url": {
                    "url": `data:image/jpeg;base64,${image}`,
                    "detail": "low"
                }
            };
        }

        messages.push({ 
            "role": "user",
            "content": [ 
                { "type": "text", "text": text },
                imageContent 
            ]
        });
    } else {
        messages.push({ "role": "user", "content": text });
    }

    try {
        let input = {
            messages: messages,
            model: modelName,
            temperature: temperature,
            top_p: 1,
            frequency_penalty: 0,
            presence_penalty: 0,
        };

        if (user) {
            input["user"] = user;
        }

        if (jsonFormat) {
            input['response_format'] = { "type":"json_object" };
        }

        const completion = await openai.chat.completions.create(input);
        const CHOICES_ARRAY = completion.choices.map(choice => choice.message.content);
        return CHOICES_ARRAY[0];
    } catch  (error) {
        console.error('Error getting openAI text response:', error);
        
        if (error.response) {
            return { "error" : error.response.data };
        } else {
            return { "error" : error.message };
        }
    }
}

async function getImage(prompt) {
    try {
        const response = await openai.createImage({
        model: "dall-e-3",
        prompt: "a white siamese cat",
        n: 1,
        size: "800x800",
        });
        
        image_url = response.data.data[0].url;
    } catch  (error) {
        console.error('Error getting openAI image response:', error);
        if (error.response) {
            return { "error" : error.response.data };
        } else {
            return { "error" : error.message };
        }
    }
}
