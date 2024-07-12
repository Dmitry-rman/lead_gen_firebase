const axios = require("axios");
const querystring = require("querystring");

const UNISENDER_API_KEY = "61aginmk7wxme8wdaqhgkwe9pto36y4r46ae1gcy";
const UNISENDER_WBSTAT_LISTID = 2;
const UNISENDER_WBSTAT_PRIVATE_LISTID = 4;

exports.subscribeEmail = async function(email,name,phone,user_uid) {
    const apiUrlPath = `https://api.unisender.com/ru/api/subscribe`;
    
    const isPrivateEmail =
        email.endsWith("@privaterelay.appleid.com") || email.endsWith("@icloud.com");
    const listId = isPrivateEmail
        ? UNISENDER_WBSTAT_PRIVATE_LISTID
        : UNISENDER_WBSTAT_LISTID;
    
    var payload = {
        format: "json",
        "fields[email]": email,
        "fields[Name]": name,
        "fields[userUID]": user_uid,
        api_key: UNISENDER_API_KEY,
        list_ids: listId,
        double_optin: 3,
    };
    
    if (phone != null) {
        payload["fields[phone]"] = phone;
    }
    
    try {
        const queryString = querystring.stringify(payload);
        const urlWithParams = `${apiUrlPath}?${queryString}`;
        const response = await axios.get(urlWithParams);

       // Handle the UniSender API response here, if needed
       const responseData = response.data;
       //console.log("UniSender API response:", responseData);
       return responseData;
     } catch (error) {
       console.error("Error in UniSender API request:", error);
       throw error; // Rethrow the error to be handled by the calling function
     }
}
