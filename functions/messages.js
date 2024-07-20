const admin = require('firebase-admin');
const assistant = require("./assistant");
const functions = require('firebase-functions');
const FUNCTIONS_REGION = "europe-west3";

const BAN_ALERT_COUNT = 3;

function _dateToISO8601(date){
    return date.toISOString().replace(/\.\d{3}Z$/, 'Z');
};

exports.createChat =  async function(data) {
    const db = admin.firestore();
    const chatRef = db.collection(`chats`);
    const now = new Date();

    try {

    // Создание новой записи чата
    const docRef = await chatRef.add({ 
        name: data.name, 
        type: data.type,
        userUID: data.userUID,
        createdAt: admin.firestore.Timestamp.fromDate(now),
        isDeleted: false
    });

    const startMessageText = `
    Здравствуйте, я буду вашим бизнес-консультантом.
    Вы можете задать мне любые вопросы относительно своего бизнеса, клиентов и проблем, которые у вас возникают.
    Давайте начнём с определения вашей целевой аудитории? Опишите, пожалуйста, ваш продукт или услугу.
    `;

    const newMessage = {
        content: startMessageText,
        createdAt: admin.firestore.Timestamp.fromDate(now),
        role: 'assistant'
    };

    await docRef.collection(`messages`).add(newMessage);

    const documentData = (await docRef.get()).data();
    // Конвертация Timestamp в секунды для клиентской обработки
    let result = {
        ...documentData,
        documentId: docRef.id,
        createdAt: _dateToISO8601(now)
    };

    return { "data": result };

    } catch (error) {
        console.error(`Error on creating chat:`, error);
        throw new Error('Failed to create chat.');
    }
};

exports.deleteChat = async function(data) {
    const db = admin.firestore();
    const chatRef = db.collection('chats').doc(data.documentId);

    try {
        const chatDoc = await chatRef.get();

        if (!chatDoc.exists) {
            console.log(`Chat document with ID ${data.documentId} does not exist.`);
            return;
        }

        const chat = chatDoc.data();

        if (data.userUID === chat.userUID) {
            await chatRef.update({
                isDeleted: true
            });
            console.log(`Chat with ID ${data.documentId} marked as deleted.`);
        } else {
            console.log(`Error on delete chat. UserUID is wrong!`);
        }
    } catch (error) {
        console.error(`Error deleting chat with ID ${data.documentId}:`, error);
        throw new Error(`Failed to delete chat ${data.documentId}`);
    }
};

exports.getMessage = async function(data) {
    await addMessage(data.user, data.chatId, data.text,  new Date(), "user");
    const requestData = {
        ...data,
        logPrefix: 'http getMessage',
        prompt: `
Imagine that you are an expert in business, startups, and marketing, and your role is to assist me.
Step by step, ask me about my product or service, and give me tasks to help achieve my goals.
Ask about my role, experience, location, market size and type, current situation, and any blocks I might have.
I will ask questions, and you will respond as if we are having a casual chat or consultation. Use \n for new lines.
You can recommend steps and choices to improve my client's experience if it is good practice and I haven't tried it yet.
Think of yourself as the best business companion and co-founder of my business or startup. Use the lean startup methodology or another highly effective approach.
Link to [R-Soft](https:\\t.me\kdimitry) if I need a help for develop mobile app, loaylity system, telegram bot or other IT automatization for business.
Response in next JSON format: { "text": text, "abuse": abuse }, where text is a text response and abuse is boolean that means that user sent a toxic request.
        `,
        jsonFormat: true,
      };
    
      try {
        const response = await assistant.getAIResponse(requestData);
        let jsonResponse = JSON.parse(response);

        if (!jsonResponse) {
            throw new Error('Invalid AI response or empty choices array.');
        }
        
        const { text, abuse } = jsonResponse;
        await addMessage(data.user, data.chatId, text, new Date(), "assistant");

        let result = { "data": { "text": text } };

        if (abuse) {
           let banned = await addAbusiveUser(data.user, data.chatId, requestData.text); // data.user должен содержать userUID
           if (banned != null) {
              result['data']['bannedChat'] = banned;
           }
        }

        return result;
      } catch (error) {
        console.error('Error in getMessage:', error);
        return { "error": "Failed to get AI text response." };
      }
};

async function addMessage(userUID, chatId, text, date, roleType) {
    const db = admin.firestore();
    const chatRef = db.collection(`chats/${chatId}/messages`);

    // Создание новой записи, если предупреждения не найдены
    const doc = await chatRef.add({ 
        role: roleType, 
        content: text,
        createdAt: admin.firestore.Timestamp.fromDate(date) 
    });
}

async function addAbusiveUser(userUID, chatId, message) {
    const db = admin.firestore();
    const bannedUsersRef = db.collection('bannedChatUsers');

    const now = new Date();
    const startOfDay = new Date(now.setHours(0, 0, 0, 0));
    const bannedTo = new Date(now.getTime() + 24 * 60 * 60 * 1000); // Добавляем 24 часа к текущему времени

    try {
        // Поиск существующей записи пользователя для сегодняшней даты
        const querySnapshot = await bannedUsersRef
            .where('userUID', '==', userUID)
            .where('createdAt', '>=', admin.firestore.Timestamp.fromDate(startOfDay))
            .limit(1)
            .get();

        let docRef;
        if (!querySnapshot.empty) {
            // Обновление существующей записи
            const doc = querySnapshot.docs[0];
            let alertCount = doc.data().alertCount + 1;
            let isBanned = alertCount >= BAN_ALERT_COUNT;
            await doc.ref.update({
                alertCount: alertCount,
                isBanned: isBanned,
                bannedTo: isBanned ? admin.firestore.Timestamp.fromDate(bannedTo) : null
            });
            docRef = doc.ref; // Получаем ссылку на документ для последующего использования
            console.log(`Updated alert count to ${alertCount} for user ${userUID}`);
        } else {
            // Создание новой записи, если предупреждения не найдены
            const doc = await bannedUsersRef.add({
                userUID: userUID,
                chatId: chatId,
                userMessage: message,
                createdAt: admin.firestore.Timestamp.fromDate(now),
                bannedTo: admin.firestore.Timestamp.fromDate(bannedTo),
                isBanned: false,
                alertCount: 1
            });
            docRef = doc; // Ссылка на созданный документ
            console.log(`Created new abuse record for user ${userUID}`);
        }

        // Возврат данных пользователя с возможным баном
        const data = (await docRef.get()).data(); // Получаем данные документа

        // Конвертация Timestamp в секунды для клиентской обработки
        let result = {
            ...data,
            createdAt: _dateToISO8601(now)
        };

        if (data.bannedTo) {
            result['bannedTo'] = _dateToISO8601(bannedTo);
        }

        return result;
    } catch (error) {
        console.error('Error managing user abuse:', error);
        return null;
    }
}

// Планировщик сброса бана
exports.clearBannedChats = functions.region(FUNCTIONS_REGION).pubsub
.schedule('0 0 * * *') // сбрасываем в 12 часов все баны
.timeZone('Europe/Moscow')
.onRun(async (context) => {
  const db = admin.firestore();
  try {
      const snapshots = await db.collection('bannedChatUsers')
          .where('isBanned', '==', true)
          .get();

      if (snapshots.empty) {
          console.log('No banned chats to clear.');
          return null;
      }

      const updatePromises = snapshots.docs.map(doc => {
          return doc.ref.update({
            isBanned: false
          });
      });

      await Promise.all(updatePromises);
      console.log(`Cleared bans for ${updatePromises.length} chats.`);

      return null;
  } catch (error) {
      console.error('Error clearing banned chats:', error);
      throw new Error('Failed to clear banned chats.');
  }
});
