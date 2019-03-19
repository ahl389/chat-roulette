// mobile code
// document code
// clean code
// convert to arrow functions and chained promises

$(function() {
    // Our interface to the chat client
    var chatClient;
    
    // Randomly assigned username
    var username;
    
    // Channel that the user of the client is currently in
    var activeChannel;
    
    // Whether or not there is another channel
    var next;
  
    // get token and initialize client
    $.ajax({
        url: '/token',
        dataType: 'json',
        method: 'post',
        success: function(data){
          // Initialize the Chat client
            Twilio.Chat.Client.create(data.token).then(client => {
                chatClient = client;
                username = data.identity;
                setTimeout(function(){
                    print(`Your randomly assigned username is <b>${username}</b>.`);
                    $('.welcome-button').show();
                }, 200);
            });
        }
    });
    
    // Bind click and keyboard events
    $('#start').on('click', function(){
        var topic = prompt('Choose a topic for your chatroom:');
        createChannel(topic);
    });
  
    $('#join').on('click', joinRandomChannel);
    
    $('.message-space-title-bar').on('click', '#next', function(){
        var currentChannel = activeChannel;
        joinRandomChannel();
        leaveCurrentChannel(currentChannel);
    });
    
    $('.message-input-area').on('keydown', 'input', function(e) {
        var input = $(this);
        var channelName = $('.message-space').attr('id');
        
        if (e.keyCode == 13) {
            chatClient.getChannelBySid(channelName).then(function(channel){
                channel.sendMessage(input.val())
                input.val('');
            }).catch(function(error){
                print(error, true)
            });
        }
    });
    
    
    /**
     * Prints message to user
     * @param {string}  message - Message body
     * @param {boolean} err - Whether or not message is an error message
     */
    function print(message, err) {
        var newAlert = $(`<div class = "am">${message}</div>`);
        
        if (err) {
            newAlert.addClass('error');
        }
        
        $('.alerts').empty()
                    .append(newAlert);
    }

    /**
     * Creates a new channel
     * @param {string}  topic - User inputted topic for new channel
     */
    function createChannel(topic) {
        chatClient.getPublicChannelDescriptors().then(function(channels){
            if (channels.items.length < 25) {
                chatClient.createChannel({
                    uniqueName: username,
                    friendlyName: topic
                }).then(function(channel) {
                    channel.join().then(function(){
                        print('Your new chatroom has been created. Wait for chatters!');
                        createMessageSpace(channel)
                        addMessageListener(channel)
                    });
                }).catch(function(error) {
                    print(error, true)
                });
            } else {
                print("Max number of channels has been reached, please join a random channel.")
            }
        })
    }
    
    /**
     * Finds a random channel for user to join
     */
    function joinRandomChannel() {
        print('Stay tuned, a random channel is being found.');
        
        var inChannel = activeChannel !== undefined ? true : false;
        
        chatClient.getPublicChannelDescriptors().then(function(channels){
            var activeChannels = channels.items;
            var numChannels = activeChannels.length;
            var rand = Math.floor(Math.random() * numChannels);
            var selectedChannel;            
            
            if (numChannels == 0) {
                print('No channels are available, please create one by hitting the "Start a Chatroom" button.')
            } else if (numChannels == 1) {
                
                next = false;
                
                if (!inChannel) {
                    selectedChannel = activeChannels[0];
                    chatClient.getChannelBySid(selectedChannel.sid).then(joinChannel);
                } else {
                    print('No other channels are available, please stay in this chatroom or create a new one')
                }
                
            } else {
                
                rand = Math.floor(Math.random() * numChannels);
                
                if (inChannel && activeChannels[rand].sid == activeChannel.sid) {
                    rand = rand < numChannels - 1 ? rand+1 : 0
                } 
                
                selectedChannel = activeChannels[rand];
                chatClient.getChannelBySid(selectedChannel.sid)
                            .then(joinChannel)
            }
        });
    }

    /**
     * Removes the user from their current channel
     */
    function leaveCurrentChannel(){
        activeChannel.leave().then(function(channel){});
    }

    /**
     * Prints chat message from user to chat window
     * @param {string}  message - Message body
     */
    function printMessage(message) { 
        var container = $('.message-space#' + message.channel.sid);
        var newMessage = $(`<div class = "message">
                                <div class = "message-body">${message.body}</div>
                                <div class = "sent-from">${message.author}</div>
                            </div>`);

        container.append(newMessage);
        
        if (message.author === username) {
            newMessage.addClass('me');
            newMessage.children('.sent-from').hide();
        } 
    }

    /**
     * Add user to channel and creates message and channel listener
     * @param {obj}  channel - The channel object representing the channel
       that the user is leaving
     */
    function joinChannel(channel){
        channel.join().then(function(channel){
            print('');
            activeChannel = channel;
            addMessageListener(channel);
            addChannelListener(channel);
            createMessageSpace(channel);
        }).catch(function(error){
            print(error, true)
        });
    }
    
    /**
     * Adds a listener to detect when a channel has been removed from the app
     * @param {obj}  channel - The channel object representing the channel
       that's been removed
     */
    function addChannelListener(channel) {
        chatClient.on('channelRemoved', function(channel){
            updateMessageSpace(channel);
        });
    }
  
    /**
     * Adds listener to detect when a new message has been sent to a channel
     * @param {obj}  channel - The channel object representing the channel
       that has received a message
     */
    function addMessageListener(channel) {
        channel.on('messageAdded', function(message) {
            printMessage(message);
            scrollMessageWindow();
        });
    }
      
    
    /**
     * Creates chat window after user joins or starts a channel
     * @param {obj}  channel - The channel object representing the channel
       that the user is now in
     */
    function createMessageSpace(channel) {
        $('.message-area').show();
        $('.welcome').hide();
        $('.message-space').attr('id', channel.sid);
        $('.message').each(function(){
            $(this).remove();
        });
        $('.message-input-area').show().attr('id', `message-input-${channel.sid}`);
        $('.title').text(`This room's topic is ${channel.friendlyName}`);
        
        if (next == false) {
            $('#next').addClass('disabled')
                      .attr('disabled', 'disabled');
        }

        loadMessages(channel);
    }
    
    /**
     * Closes chat window after channel has been deleted
     * @param {obj}  channel - The channel object representing the channel
       that is now closed
     */
    function updateMessageSpace(channel) {
        $('.title').text(`This owner of this room has left and this room is now closed.`);
        $('.message-input-area').hide();
        print('Please join or create a new room');
    }
    
    /**
     * Loads last 30 messages in channel to chat window
     * @param {obj}  channel - The channel object representing the channel
       that the user is now in
     */
    function loadMessages(channel){
        channel.getMessages(30).then(function(messages){
            for (let message of messages.items) {
                printMessage(message);
            }
            
            scrollMessageWindow();
        }).catch(function(){
            print('No messages to load.', true)
        });
    }
    
    /**
     * Scrolls to the bottom of the chat window
     */
    function scrollMessageWindow() {
        $('.message-space').animate({ 
            scrollTop: $('.message-space')[0].scrollHeight + 75
        }, 200);
    }
});








