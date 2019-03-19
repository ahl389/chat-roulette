// verify screennames arent taken
// show messages on each screen
// show number of messages next to user in friendlist
// make channels private
// make channels go both ways 
// listen for user sign on


// show all members in general chat
// click on member to create DM

$(function() {
  // Get handle to the chat div
  var $activeChatWindow = $('#messages');

  // Our interface to the Chat service
  var chatClient;

  // A handle to the "general" chat channel - the one and only channel we
  // will have in this sample app
  var userChannel;
  
  var userChannels = [];
  
  // The user's current DM channel
  var activeChannel;
  
  

  // The server will assign the client a random username - store that value
  // here
  var username;
  
 

  // Helper function to print info messages to the chat window
  function print(infoMessage, asHtml) {
    var $msg = $('<div class="info">');
    if (asHtml) {
      $msg.html(infoMessage);
    } else {
      $msg.text(infoMessage);
    }
    $activeChatWindow.append($msg);
  }

  // Helper function to print chat message to the chat window
  function printMessage(message) {
    var $user = $('<span class="username">').text(message.author + ':');
    if (message.author === username) {
      $user.addClass('me');
    }
    var $message = $('<span class="message">').text(message.body);
    var $container = $('<div class="message-container">');
    $container.append($user).append($message);
    $activeChatWindow.append($container);
    $activeChatWindow.scrollTop($activeChatWindow[0].scrollHeight);
  }

  // Alert the user they have been assigned a random username
  print('Logging in...');
  
  
    // $('#userid').on('keydown', function(e) {
//         console.log('userid entered')
//         var input = $(this);
//
//         if (e.keyCode == 13) {
//
//             username = input.val();
//         }
//     });
    
    username = prompt("enter a username");
    
    $.ajax({
        url: '/token/' + username,
        dataType: 'json',
        method: 'post',
        success: function(data){
            console.log(data)
        // Alert the user they have been assigned a random username
            //username = prompt("enter a username");
        
            print('You have logged in with username of: '
            + '<span class="me">' + data.identity + '</span>', true);

            // Initialize the Chat client
            Twilio.Chat.Client.create(data.token).then(client => {
                console.log('client initialized')
                chatClient = client;
                chatClient.getSubscribedChannels().then(createOrJoinGeneralChannel);
                // chatClient.on('channelAdded', function(channel){
//                     updateFriends();
//                 });
            });
        
        }
    });
    
    

  
 
  

  function createOrJoinGeneralChannel() {
    // Get the general chat channel, which is where all the messages are
    // sent in this simple application

    
 
     // get all online users
    // make friends list out of them
    // when new user clicks on user's name in friends list, a new private channel is created
 
    // create channel for user
    chatClient.getChannelByUniqueName(username).then(function(channel) {
        userChannel = channel;
        console.log('Found user channel:');
        console.log(userChannel);
        //setupChannel();
        updateFriends();
    }).catch(function() {
        // If it doesn't exist, let's create it
        console.log('Creating new dm channel');
        
        chatClient.createChannel({
            uniqueName: username,
            friendlyName: 'Chat with ' + username,
        }).then(function(channel) {
            userChannel = channel;
            console.log('\nchannel created')
            console.log(userChannel.uniqueName)
            setupChannel();
            //updateFriends();
        }).catch(function(channel) {
            console.log(channel)
            console.log('Channel could not be created');
        });
        
       
        
    });

  }

  // Set up channel after it has been found
  function setupChannel() {
    // Join the general channel
    userChannel.join().then(function(channel) {
      print('Joined' + channel.uniqueName + ' as '
      + '<span class="me">' + username + '</span>.', true);
      
      updateFriends();
    });
    


    // Listen for new messages sent to the channel
    userChannel.on('messageAdded', function(message) {
      printMessage(message.author, message.body);
      showMessageIndicator(message.author, message.body);
    });
  }
  
  function listen(channel) {
      chatClient.getChannelByUniqueName(channel.uniqueName).then(function(channel){
          channel.on('messageAdded', function(message) {
              showMessageIndicator(message);
              printMessage(message);
          });
      });
  }
  
  function showMessageIndicator(message) {
      console.log(message.author)
      var li = $(`.user#${message.author}`);
      li.html(li.text() + ' !!');
  }
  
   
    function processPage(channels) {
        userChannels.push(...channels.items)
        if (channels.hasNextPage) {
            console.log('another page')
            channels.nextPage().then(processPage);
            //channels.nextPage();
        } else {
            userChannels.sort(function(a, b) {
               if (a.uniqueName > b.uniqueName) {
                   return 1;
               } else {
                   return -1;
               }
            });
        
            console.log(userChannels)

            for (let channel of userChannels) {
                chatClient.getUserDescriptor(channel.uniqueName).then(function(user){
                    console.log('\n Channel name: ' + channel.uniqueName)
                    console.log('corresponding user is: ' + user.identity)
                    if (user.online && user.identity != username) {
                        console.log('user online ' + channel.uniqueName)
                        $('.friends-list').append(`<div class = "user" id = "${channel.uniqueName}" data-sid = ${channel.sid}>${channel.uniqueName}</div>`);
                        listen(channel)
                    }
                }).catch(function(error){
                    console.log('\n Channel name: ' + channel.uniqueName)
                    console.log('corresponding user not found: ' + channel.uniqueName);
                });
            }
        }
    }
    
    function updateFriends() {
        chatClient.getPublicChannelDescriptors().then(processPage);
        //chatClient.getPublicChannelDescriptors().then(function(channels){
            
       
        //chatClient.getPublicChannelDescriptors().then(function(channels){
            // userChannels = channels.items.sort(function(a, b) {
            //    if (a.uniqueName > b.uniqueName) {
            //        return 1;
            //    } else {
            //        return -1;
            //    }
            // });
            
        
       // });
        //});
    }

  // Send a new message to the general channel
 
  
    $('.message-area').on('keydown', 'input', function(e) {
        console.log('input entered')
        var input = $(this);
        var sid = input.parent().attr('id');
        $activeChatWindow = $(this).parent('.messageSpace');
        
        if (e.keyCode == 13) {
            activeChannel = chatClient.getChannelBySid(sid).then(function(channel){
                console.log('message sent to ' + channel.uniqueName)
                channel.sendMessage(input.val())
                input.val('');
            });
        }
    });
  
  
  $('.friends-list').on('click', '.user', function(){
      channelName = $(this).attr('id');
      console.log('clicked on ' + channelName)
      chatClient.getChannelByUniqueName(channelName).then(function(channel) {
          dm = channel;
          users = dm.getUserDescriptors().then(function(users){
              console.log(users)
              existing = users.items.find(user => user.identity == username)
              console.log(existing)
              
              if (existing) {
                  createMessageSpace();
              } else {
                  console.log('not exisitng')
                  dm.join().then(function(channel){
                      createMessageSpace();
                  });
              }
          });
      });
  });
  
  function createMessageSpace() {
      var messageSpace = $(`<div class = "messageSpace" id = ${dm.sid}>
                                <h3>Chat with ${dm.uniqueName}</h3>
                                <input class = "dm-input" id = "dm-input-${dm.uniqueName}" type="text" autofocus>
                              </div>`)
      $('.message-area').append(messageSpace);
  }
});








