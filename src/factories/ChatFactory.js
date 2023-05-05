'use strict';

import PrivateChat from '../func/PrivateChat.js';
import GroupChat from '../func/GroupChat.js'; 

class ChatFactory {
    static create(client, data) {
        if(data.isGroup) {
            return new GroupChat(client, data);
        }

        return new PrivateChat(client, data);
    }
}

export default ChatFactory;