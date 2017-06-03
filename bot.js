module.exports = {
    start: function(db, bot, config, HashMap) {

        // Strings
        const errorText_0 = "Mh, something went wrong. Retry the last phase or /cancel to start over"
        const errorText_1 = "Command unrecognised. See /help"
        const errorText_2 = "Something unexpected happened. Please restart from the beginning."
        const startText = "Yay, welcome and w/e"
        const helpText = "Yay, commands and w/e"
        const cancelText = "Yay, aborting all efforts"
        const addqueryText_0 = "Great! Send me a list of keywords separated by a single space. Like this: `Doctor` `Who`"
        const addqueryText_1 = "Gotcha. Now send me the Feed URL"
        const addqueryText_2 = "Yay. I've added the query to your account. You will receive notifications on matching elements"
        const whitelistDenyText = "You are not allowed to use this bot. Sorry."

        // Holds the current conversation state per user
        var convStatusMap = new HashMap();
        // Holds the Keyword array for the last phase of /addquery conversation
        var tempArrayMap = new HashMap();
        // Initial conversation handler status
        var status = 0;

        bot.on('message', (msg) => {
            // TODO: allow use in group: if in group, every message starts with @bot
            //  (privacy activated)
            const chatId = msg.chat.id;
            const message = msg.text;
            console.log("---")
            console.log(chatId + " : " + message)

            if (!convStatusMap.get(chatId))
                status = 0;
            else
                status = convStatusMap.get(chatId);

            console.log("C Status:" + status)
            if (!config.whitelist_enabled || contains.call(config.whitelist, chatId)) {
                console.log("Allowed")
                    // Fallback /cancel
                if (message.match(/\/cancel\s*/)) {
                    bot.sendMessage(chatId, cancelText);
                    convStatusMap.set(chatId, 0)
                }
                // Conversation Handling
                switch (status) {
                    case 0:
                        if (message.match(/\/start\s*/))
                            bot.sendMessage(chatId, startText);
                        else if (message.match(/\/help\s*/))
                            bot.sendMessage(chatId, helpText);
                        else if (message.match(/\/addquery\s*/)) {
                            bot.sendMessage(chatId, addqueryText_0, {
                                parse_mode: "Markdown"
                            })
                            convStatusMap.set(chatId, 1)
                        } else if (message.match(/\/status\s*/)) {
                            // COMPOSE SQL TO MATCH EVERY EXISTENT QUERY
                            var query = "SELECT * FROM QUERIES WHERE Owner = ?"
                            var text = "Your queries:";
                            var active = "Disabled"
                            db.all(query, chatId, function(error, rows) {
                                rows.forEach(function(row) {
                                    if (row.Active) active = "Enabled"
                                    text = text + "\n\n ID: *" + row.ID + "*\n Keywords: " + row.Keywords.toString() + "\n FeedURL: `" + row.FeedURL + "` \n" + active
                                });
                                bot.sendMessage(chatId, text.toString(), {
                                    parse_mode: "Markdown"
                                })
                            })

                        } else if (message.match(/\/disable\s+[0-9]*/)) {
                            var array = message.match(/\/disable\s*([0-9]+)/)
                            var query = "UPDATE QUERIES SET `Active`= ? WHERE `_rowid_`=? AND Owner = ?;"
                            db.run(query, [0, array[1], chatId], function(){
                                bot.sendMessage(chatId, "Your query with ID "+array[1] +" was disabled.")
                            })
                        } else if (message.match(/\/enable\s+[0-9]*/)) {
                            var array = message.match(/\/enable\s*([0-9]+)/)
                            var query = "UPDATE QUERIES SET `Active`= ? WHERE `_rowid_`=? AND Owner = ?;"
                            db.run(query, [1, array[1], chatId], function(){
                                bot.sendMessage(chatId, "Your query with ID "+array[1] +" was enabled.")
                            })
                        }
                        else {
                            bot.sendMessage(chatId, errorText_1)
                        }
                        break;

                    case 1:
                        // TODO: pre validate message (only words and spaces)
                        if (message.match(/[A-Za-z\s0-9]*/)) {
                            var array = JSON.stringify(message.split(' '));
                            convStatusMap.set(chatId, 2)
                            tempArrayMap.set(chatId, array)
                            bot.sendMessage(chatId, addqueryText_1)
                        } else {
                            bot.sendMessage(chatId, errorText_0)
                        }
                        break;

                    case 2:
                        // TODO: pre validate URL: regex + try to see if it's valid
                        convStatusMap.set(chatId, 0)
                        bot.sendMessage(chatId, addqueryText_2)
                            // TODO: check again if we're inserting valid values
                        db.run("INSERT INTO `QUERIES`(`ID`,`Keywords`,`Owner`,`FeedURL`,`Active`) VALUES (NULL,?,?,?, 1)", tempArrayMap.get(chatId), chatId, message);
                        break;

                    default:
                        bot.sendMessage(chatId, errorText_2);
                        convStatusMap.set(chatId, 0)
                }
            } else {
                console.log("Denied")
                bot.sendMessage(chatId, whitelistDenyText + " chatId: " + chatId)
            }
        });
    }
};