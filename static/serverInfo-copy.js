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

    // Vue instance
    var app = new Vue({
        el: '#app',
        data: {
            messages: []
        },
        methods: {
            scrollToEnd: function() {
                var container = this.$el.querySelector('.messages');
                container.scrollTop = container.scrollHeight;
            }
        },
        created: function () {
            // initialize existing messages
            this.$http.get('/messages').then(response => {
                if(response.status === 200){
                    this.messages = response.body;
                }
            }).catch((err)=>{
                if(err.status === 401){
                    alert("couldn't get messages");
                }
            });
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
    socket.on('init-chat', function(messages) {
        app.messages = messages;
    });
})();