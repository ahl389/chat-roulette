// deploy on heroku
// mobile code
// document code
// clean code
// convert to arrow functions and chained promises
// fix homepage and app.py - delete extra stuff, no separate landing page

$(function() {
    // { obj - Client } Our interface to the chat client
    var chatClient;
    
    // { String }       Randomly assigned username
    var username;
    
    // {obj - Channel } Channel that the user of the client is currently in
    var activeChannel;
    
    // { Boolean }      Whether or not there is another channel
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
    
    // Bind click events
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
    
    function print(message, err) {
        var newAlert = $(`<div class = "am">${message}</div>`);
        
        if (err) {
            newAlert.addClass('error');
        }
        
        $('.alerts').empty()
                    .append(newAlert);
    }
 
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
                    rand = rand < numChannels ? rand+1 : 0
                } 
                
                selectedChannel = activeChannels[rand];
                console.log(activeChannels)
                console.log(rand)
                console.log(selectedChannel)
                chatClient.getChannelBySid(selectedChannel.sid)
                    .then(joinChannel)
            }
        });
    }

    function leaveCurrentChannel(){
        activeChannel.leave().then(function(channel){
            print(`You've left ${channel.friendlyName}`);
        });
    }

  // Helper function to print chat message to the chat window
    function printMessage(message) { 
        var container = $('.message-space#' + message.channel.sid);
        var newMessage = $(`<div class = "message">
                                <div class = "message-body">${message.body}</div>
                                <div class = "sent-from">${message.author}</div>
                            </div>`);

        container.append(newMessage);
        //newMessage.insertBefore(container.children('.message-input-area'));
        
        if (message.author === username) {
            newMessage.addClass('me');
            newMessage.children('.sent-from').hide();
        } 
    }

  
    function joinChannel(channel){
        channel.join().then(function(channel){
            print(`You've joined a random channel.`)
            activeChannel = channel;
            addMessageListener(channel);
            addChannelListener(channel);
            createMessageSpace(channel);
        }).catch(function(error){
            print(error, true)
        });
    }
    
    function addChannelListener(channel) {
        chatClient.on('channelRemoved', function(channel){
            console.log('removed')
            updateMessageSpace(channel);
        });
        // chatClient.on('channelUpdated', function(channel){
//             console.log('updated')
//             updateMessageSpace(channel);
//         });
    }
  
    function addMessageListener(channel) {
        channel.on('messageAdded', function(message) {
            printMessage(message);
            scrollMessageWindow();
        });
    }
      
    $('.message-input-area').on('keydown', 'input', function(e) {
        var input = $(this);
        var channelName = $('.message-space').attr('id');
        console.log(channelName)
        //activeChatWindow = $(this).parent('.message-space');
        
        if (e.keyCode == 13) {
            chatClient.getChannelBySid(channelName).then(function(channel){
                channel.sendMessage(input.val())
                input.val('');
            }).catch(function(error){
                print(error, true)
            });
        }
    });

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
    
    function updateMessageSpace(channel) {
        $('.title').text(`This room is now closed.`);
        $('.message-input-area').hide();
        print('Please join or create a new room');
    }

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
    
    function scrollMessageWindow() {
        $('.message-space').animate({ 
            scrollTop: $('.message-space')[0].scrollHeight + 100
        }, 200);
    }
});








