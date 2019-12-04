(function() {
    var socket = io('https://localhost:3000');

    // Message Component
    Vue.component('message', {
        props: ['messageData'],
        template: ` <div class="media-content">
                        <div class="content">
                            <p>
                                <strong>{{messageData.user}}</strong> <small>{{messageData.date}}</small>
                                <br>
                                {{messageData.text}}
                            </p>
                        </div>
                    </div>`
    });

    // Input message Component
    Vue.component('input-message', {
        data: function() {
            return {
                message: ''
            };
        },
        template: ` <div class="controls field has-addons">
                        <div class="control is-expanded">
                            <input v-model="message" v-on:keydown.enter="send" class="input is-primary" placeholder="Write message">
                        </div>
                        <div class="control">
                            <button v-on:click="send" :disabled="!message" class="button is-primary">Send</button>
                        </div>
                    </div>`,
        methods: {
            send: function() {
                if (this.message.length > 0) {
                    this.$emit('send-message', this.message);
                    this.message = '';
                }
            }
        }
    });

    // Vue instance
    var app = new Vue({
        el: '#app',
        data: {
            messages: [],
            users: [],
            userName: '',
            isLogged: false
        },
        methods: {
            sendMessage: function(message) {
                if (message) {
                    socket.emit('send-msg', { message: message, user: "test" });
                }
            },
            setName: function(userName) {
                this.userName = userName;
                this.isLogged = true;
                socket.emit('add-user', this.userName);
            },
            scrollToEnd: function() {
                var container = this.$el.querySelector('.messages');
                container.scrollTop = container.scrollHeight;
            }
        },
        updated() {
            this.scrollToEnd();
        }
    });


    /**Client Socket events**/

    // When the server emits a message, the client updates message list
    socket.on('read-msg', function(message) {
        app.messages.push({ text: message.text, user: message.user, date: message.date });
    });

    // Init chat event. Updates the initial chat with current messages
    socket.on('init-chat', function(messages) {
        app.messages = messages;
    });

    // Init user list. Updates user list when the client init
    socket.on('update-users', function(users) {
        app.users = users;
    });
})();