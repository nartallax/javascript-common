pkg('bot.telegram', () => {
	
	let HttpClient = pkg("net.http.client"),
		util = pkg.external("util"),
		Event = pkg("util.event");
	
	class TelegramBot {
		constructor(apiConfig){
			this._longPollingJitter = 15000;
			this._longPollingTimeout = 180000 - this._longPollingJitter;
			this._updateOffset = 0;
			this._limit = 100;
			
			this._config = apiConfig;
			
			this._client = new HttpClient({
				timeout: this._longPollingTimeout + this._longPollingJitter
			});
			
			this.onAnyUpdate = new Event("TelegramBot.onAnyUpdate");
			
			this.onMessage = new Event("TelegramBot.onMessage");
			this.onMessageEdited = new Event("TelegramBot.onMessageEdited");
			this.onGroupChatCreated = new Event("TelegramBot.onGroupChatCreated");
			this.onMemberJoin = new Event("TelegramBot.onMemberJoin");
			this.onMemberLeave = new Event("TelegramBot.onMemberLeave");
			this.onCallbackQuery = new Event("TelegramBot.onCallbackQuery");
			
			this.onError = new Event("TelegramBot.onError");
		}
		
		_urlOf(methodName){
			return this._config.protocol + "://" + this._config.host + util.format(this._config.pathFormat, this._config.token, methodName);
		}
		
		async _callUnsafe(methodName, body){
			try {
				body = JSON.stringify(body);
			} catch(e){
				log.error("Failed to make call to method " + methodName + ": body is not JSON convertible. " + e);
				log.error(e.stack);
				throw e;
			}
			//console.log("querying " + methodName + " with " + body);
			let resp = await this._client.post({url: this._urlOf(methodName), body: body, headers: {"Content-Type": "application/json"}});
			//console.log("got resp from " + methodName);
			try {
				resp = JSON.parse(resp.data);
			} catch(e){
				log.error("Failed to make call to method " + methodName + ": result is not JSON parsible: " + resp + "; " + e);
				log.error(e.stack);
				throw e;
			}
			
			if(resp.ok)
				return resp.result;
			
			log.error("Failed to make call to method " + methodName + ": telegram-side error (errcode = " + resp.error_code + "): " + resp.description);
			fail(resp.description);
		}
		
		async _callSafe(method, body){
			try {
				return await this._callUnsafe(method, body);
			} catch(e){
				this.onError.fire(e);
			}
		}
		
		_call(method, body){ return this.onError.hasListeners() ? this._callSafe(method, body) : this._callUnsafe(method, body) }
		
		// add some method-like functions to update object
		_enchant(update, messageSource){
			if(update.message){
				update.message.source = messageSource || "user";
				update.message.reply = async (str, markup) => {
					str.replace(/\s/g, "") && await this.sendMessage(update.message.chat.id, str, { reply_markup: markup });
				}
				if(update.message.chat)
					update.message.chat.reply = update.message.reply;
			}
			if(update.callback_query){
				update.callback_query.message.original_from = update.callback_query.message.from;
				update.callback_query.message.from = update.callback_query.from;
				this._enchant(update.callback_query, "callback_query");
			}
		}
		
		async start(){
			this._stopped = false;
			while(!this._stopped){
				try {
					let callRes = await this._call("getUpdates", { offset: this._updateOffset, limit: this._limit, timeout: this._longPollingTimeout });
					callRes.forEach(update => {
						this._updateOffset = Math.max(this._updateOffset, update.update_id + 1);
						this._enchant(update);
						this.onAnyUpdate.fire(update);
						if("message" in update && update.message){
							if(update.message.group_chat_created) 
								this.onGroupChatCreated.fire(update.message);
							else if(update.message.new_chat_member) 
								this.onMemberJoin.fire({member: update.message.new_chat_member, chat: update.message.chat})
							else if(update.message.left_chat_member) 
								this.onMemberJoin.fire({member: update.message.left_chat_member, chat: update.message.chat})
							else this.onMessage.fire(update.message);
							
						}
						("edited_message" in update) && this.onMessageEdited.fire(update.edited_message);
						("callback_query" in update) && this.onCallbackQuery.fire(update.callback_query);
					});
				} catch(e){
					log.error("Failed to fetch and/or process update(s): " + e);
					log.error("Therefore, update throttled for 10s.");
					await sleep(10000);
				}
				
			}
		}
		stop(){ this._stopped = true; }
		
		getMe(){ return this._call("getMe") }
		sendMessage(chat, text, otherParams){
			(typeof(chat) === "number") || fail("Expected chat ID to be number.");
			(typeof(text) === "string") || fail("Expected message to be string.");
			otherParams = otherParams || {};
			otherParams.text = text;
			otherParams.chat_id = chat;
			otherParams.parse_mode = otherParams.parse_mode || "HTML";
			return this._call("sendMessage", otherParams);
		}
		getChat(chatId){ return this._call("getChat", {chat_id: chatId})  }
	}
	
	return TelegramBot;
	
});