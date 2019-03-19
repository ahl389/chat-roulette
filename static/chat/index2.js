// verify screennames arent taken
// show messages on each screen
// show number of messages next to user in friendlist
// make channels private
// make channels go both ways 
// listen for user sign on


// show all members in general chat
// click on member to create DM

$(function() {
    // our interface to the chat client
    var chatClient;
    
    // main html container for all message activity
    var chatContainer = $('#message-area');
    
    // chat window currently being used
    var activeChatWindow;
    
    // channel object for general channel
    var generalChannel;

    // array of users currently online
    var onlineUsers = [];
    
    var generalUsers = [];
    
    var localUser;

    // identity of client user
    var username = prompt("Enter a username");
  
    // get token and initialize client
    $.ajax({
        url: '/token/' + username,
        dataType: 'json',
        method: 'post',
        success: function(data){
          // Initialize the Chat client
            Twilio.Chat.Client.create(data.token).then(client => {
                chatClient = client;
                chatClient.getSubscribedChannels().then(function(channels){
                    // listen to all already subscribed channels
                    channels.items.forEach(channel => listen(channel));

                    // join general, if havent already (and create it if first user ever)
                    createOrJoinChannel('general');
                });
            });
        }
    });
  
 

  // Helper function to print info messages to the chat window
  function print(infoMessage, asHtml) {
    var $msg = $('<div class="info">');
    if (asHtml) {
      $msg.html(infoMessage);
    } else {
      $msg.text(infoMessage);
    }
    chatContainer.append($msg);
  }

  // Helper function to print chat message to the chat window
    function printMessage(message) { 
        var container = $('.message-space#' + message.channel.uniqueName)
        var newMessage = $(`<div class = "message"></div>`);
        //var user = $('<span class = "username">').text(message.author + ': ');
        
        if (message.author === username) {
            newMessage.addClass('me');
        }

        //newMessage.append(user).append(message.body).insertBefore(container.children('input'));
        newMessage.append(message.body).insertBefore(container.children('input'));
    }
  
    function createOrJoinChannel(channelName, priv = false, friend = '') {
        chatClient.getChannelByUniqueName(channelName).then(function(channel) {
            setupChannel(channel);
        }).catch(function(error) {
            chatClient.createChannel({
                uniqueName: channelName,
                isPrivate: priv
            }).then(function(channel) {
                channel.join().then(function(){
                    if (friend) {
                        channel.add(friend).then(function(){
                            setupChannel(channel);
                        });
                    }
                    
                    listen(channel)
                });
            }).catch(function(error) {
                console.log(error)
            });
        });
    }
    
    function setupChannel(channel){
        if (channel.uniqueName == 'general') {
            generalChannel = channel;
            joinChannel(channel);
        } else {
            createMessageSpace(channel);
        }
    }
  
    function joinChannel(channel){
        channel.join().then(function(channel){
            console.log('joined')
            updateOnlineMembers();
        }).catch(function(){
            updateOnlineMembers();
            console.log('Welcome Back');
        });
    }
  
    function listen(channel) {
        channel.on('messageAdded', function(message) {
            showMessageIndicator(message);
            printMessage(message);
        });
    }
    
  
    function showMessageIndicator(message) {
        if ($('.message-space#' + message.channel.uniqueName).length == 0) {
            var mi = $(`.user#${message.author} .mi`);
            mi.css('background-color', 'green');
        }
    }
    
    function updateOnlineMembers() {
        generalChannel.getMembers().then(members => {
            for (let member of members) {
                member.getUser().then(function(user){
                    addToFriendsList(user);
                    addUserListener(user);
                });
            }
        });
    }
    
    function addUserListener(user){
        user.on('updated', function(user){
            console.log(user.user.identity + ' is now online')
            addToFriendsList(user.user);
        });
    }
    
    function addToFriendsList(user) {
        if (user.online && user.identity !== username) {
            $('.friends-list').append(`<div class = "user" id = "${user.identity}">
                                        <span class = "mi"></span>${user.identity}
                                        </div>`);
        }
    }
  
    $('.message-area').on('keydown', 'input', function(e) {
        var input = $(this);
        var channelName = input.parent().attr('id');
        activeChatWindow = $(this).parent('.message-space');
        
        if (e.keyCode == 13) {
            var activeChannel = chatClient.getChannelByUniqueName(channelName).then(function(channel){
                channel.sendMessage(input.val())
                input.val('');
            }).catch(function(error){
                console.log(error);
            });
        }
    });
  
  
    $('.friends-list').on('click', '.user', function(){
        var friend = $(this).attr('id');
        var names = [username, friend];

        names.sort(function(a,b){
            if (a > b) {
                return 1;
            } else {
                return -1;
            }
        });

        var uniqueName = names.join('');
        $(this).children('.mi').css('background-color', 'initial');
        createOrJoinChannel(uniqueName, true, friend);
    });

    function createMessageSpace(channel) {
        if ($('.message-space#' + channel.uniqueName).length == 0) {
            var messageSpace = $(`<div class = "message-space" id = "${channel.uniqueName}">
                                    <h3>Chat with ${channel.uniqueName}</h3>
                                    <input class = "dm-input" id = "dm-input-${channel.uniqueName}" type="text" autofocus>
                                  </div>`)
            $('.message-area').append(messageSpace); 

            loadMessages(channel);
        }
    }

    function loadMessages(channel){
        channel.getMessages(10).then(function(messages){
            for (let message of messages.items) {
                printMessage(message);
            }
        }).catch(function(){
            console.log('No message to load')
        });
    }
});








