const openAIServices = require('./openai_services');
const telegram = require("./telegram");

const AssisstantType = {
    openai: 'openai',
};

exports.AssisstantType = AssisstantType;

exports.getAssistant = async function(data) {
    const requestData = {
        ...data,
        temperature: 0.2 
    };

    const response = await _getAIResponse(requestData);
    
    if (response.error) {
       return `Извините, произошла внутреняя ошибка! Пожалуйста, свяжитесь со службой поддержки если это повторится.`;
    } else {
       //console.log(`getAIResponseAssistant response: ${response}`);
       return response;
    }
 }

exports.getAIResponse = async function(data) {
    const response = await _getAIResponse(data);
    
    if (response.error) {
       return `Извините, произошла внутреняя ошибка! Пожалуйста, свяжитесь со службой поддержки если это повторится.`;
    } else {
        if (data.logPrefix != null) {
          console.log(`getAIResponse response: ${response}`);
        }

        return response;
    }
 }
 
async function _getAIResponse(data) {
    if (data.logPrefix != null) {
        try {
            let message = `${data.logPrefix}:`;
            if (data.user) {
               message += ` ${data.user}`;
            }

            message += `, ${data.text}`;
            if (data.image) {
                message += `, image(${data.image.length})`;
            }
         } catch (error) {
            console.log(error);
        }

        const logText = `${data.logPrefix}: ${data.user || "none"}, ${data.text}`;
        console.log(logText);
        telegram.sendServiceMessage(logText);
    } else {
       // console.log(data.text);
    }

    if (data.language != null) {
        data.text += `. Use ${data.language} language in response.`;
    }

    try {
        switch (data.type) {
            case AssisstantType.chatgpt:
                    const result = await openAIServices.getAIConversation(data);
                    const error = result.error;

                    if (data.logPrefix != null) {
                        const logText = `${result}`;
                        console.log(logText);
                        telegram.sendServiceMessage(logText);
                    }

                    return result;
    
            default:
                throw `Invalid service type ${type}`;
        }
    } catch (error) {
        console.error('Error on getAIResponse:', error);
        throw error;
    }
}

exports.getAIImage = async function(prompt, type) {
    try {
        switch (type) {
            case AssisstantType.openai:
                return await openAIServices.getImage(prompt);
            default:
                return { "error" : "Invalid service type " + type };
        }
    } catch (error) {
        console.error('Error getAIImage:', error);
       
        return {
          "error" : error
        };
    }
}