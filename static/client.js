(function() {
    const socket = io('https://localhost:3000');
    let clientUsername = "anonymous";
    let allMessages = [];

    const NotFound = { template: '<p>Page not found</p>' }
    const ClieChatView = {
        template: `
                    <div>
                        <h5>Hello {{user}}! Your chat window:</h5>
                        <div class="columns">
                            <div class="column is-two-thirds">
                                <transition name="slide-fade">
                                    <div class="box" id="chat-window">
                                        <div class="messages">
                                            <ul>
                                                <li v-for="message in messages">
                                                    <message v-bind:message-data="message"></message>
                                                </li>
                                            </ul>
                                        </div>
                                        <input-message v-on:send-message="sendMessage"></input-message>
                                    </div>
                                </transition>
                            </div>
                        </div>
                    </div>
            `,
        methods: {
            sendMessage: function(message) {
                if (message) {
                    socket.emit('send-msg', { message: message, user: clientUsername });
                }
            }

        },
        created: function (messages) {
            // initialize existing messages
            this.$http.get('/messages').then(response => {
                if(response.status === 200){
                    this.messages = response.body;
                    allMessages = this.messages;
                }
            }).catch((err)=>{
                if(err.status === 401){
                    alert("couldn't get messages");
                }
            });
        },
        data: function(){
            return{
                user: clientUsername,
                messages: []
            }
        },
    };
    const Login = {
        template: `
                    <form>
                        <div class="form-group">
                            <label for="email">Email address:</label>
                            <input v-model="email" type="email" class="form-control" id="email">
                        </div>
                        <div class="form-group">
                            <label for="pwd">Password:</label>
                            <input v-model="password" type="password" class="form-control" id="pwd">
                        </div>
                        <div class="checkbox">
                            <label><input type="checkbox"> Remember me</label>
                        </div>
                        <button v-on:click="login(email, password)"  class="btn btn-primary">Submit</button>
                    </form>
            `,
        methods: {
            login: function(email, password){
                localStorage.email = email;
                localStorage.password = password;
                console.log("Login");
                this.$http.post('/login', { email: email, password: password}).then( response =>{
                    clientUsername = email;
                    if(response.status === 206){
                        return router.push('otp');
                    } else if(response.status === 200) {
                        localStorage.clear();
                        localStorage.loggedin = true;
                        return router.push('setup');
                    }
                }).catch(err => {
                    alert("Invalid creds");
                });
            }
        },
        data: function(){
            return {
                email: "john.doe@gmail.com",
                password: "test"
            }
        }
    }
    const Otp = {
        template: `
                <form>
                    <div class="form-group">
                        <label for="otp">Enter Otp:</label>
                        <input v-model="otp" type="otp" class="form-control" id="otp">
                    </div>
                    <button v-on:click="login(otp)"  class="btn btn-default">Submit</button>
                </form>
            ` ,
        data: function(){
            return {
                otp: ""
            }
        },
        methods: {
            login: function(otp){
                const options = {
                    headers: {
                        ['x-otp']: otp
                    }
                }
                const payload = {
                    email: localStorage.email,
                    password: localStorage.password
                }
                this.$http.post('/login', payload, options).then((response)=>{
                    if(response.status === 200){
                        localStorage.clear();
                        localStorage.loggedin = true;
                        return router.push('setup');
                    }
                    alert('Invalid creds');
                }).catch(err => {
                    alert("Invalid creds");
                });
            }
        }
    }
    const Setup = {
        template: `
                <div>
                    <div v-if="twofactor.secret">
                        <h3>Current Settings</h3>
                        <img :src="twofactor.dataURL" alt="..." class="img-thumbnail">
                        <p>Secret - {{twofactor.secret || twofactor.tempSecret}}</p>
                        <p>Type - TOTP</p>
                        <p><router-link to="/cliechatview">Go to Chat</router-link></p>
                    </div>
                    <div v-if="!twofactor.secret">
                        <h3>Setup Otp</h3>
                        <div>
                            <button v-on:click="setup()"  class="btn btn-default">Enable</button>
                        </div>
                        <span v-if="!!twofactor.tempSecret">
                            <p>Scan the QR code or enter the secret in Google Authenticator</p>
                            <img :src="twofactor.dataURL" alt="..." class="img-thumbnail">
                            <p>Secret - {{twofactor.tempSecret}}</p>
                            <p>Type - TOTP</p>
                            <form>
                                <div class="form-group">
                                    <label for="otp">Enter Otp:</label>
                                    <input v-model="otp" type="otp" class="form-control" id="otp">
                                </div>
                                <button v-on:click="confirm(otp)"  class="btn btn-primary">confirm</button>
                            </form>
                        </span>
                    </div>
                    <div>
                        <h3>Disable</h3>
                        <form>
                            <router-view></router-view>
                            <button v-on:click="disable()"  class="btn btn-danger">Disable</button>
                        </form>
                    </div>
                </div>
            `,
        methods: {
            /** setup two factor authentication*/
            setup: function(){
                this.$http.post('/twofactor/setup', {}).then(response => {
                    const result =  response.body;
                    if(response.status === 200){
                        alert(result.message);
                        this.twofactor = result;
                    }
                });
            },
            /** Verify the otp once to enable 2fa*/
            confirm: function(otp){
                const body = {
                    token: otp
                }
                this.$http.post('/twofactor/verify', body).then(response => {
                    const result =  response.body;
                    if(response.status === 200){
                        this.twofactor.secret = this.twofactor.tempSecret;
                        this.twofactor.tempSecret = "";
                    }
                }).catch(err=>alert('invalid otp'));
            },
            /** disable 2fa */
            disable: function(){
                this.$http.delete('/twofactor/setup').then(response => {
                    const result =  response.body;
                    if(response.status === 200){
                        router.push('login');
                    }
                }).catch(err => alert('error occured'));
            }
        },
        data: function(){
            return {
                twofactor: {
                    secret: "",
                    tempSecret: ""
                },
                otp: ""
            }
        },
        /** when component is created check if 2fa is enabled*/
        created: function(){
            this.$http.get('/twofactor/setup').then(response => {
                const result =  response.body;
                if(response.status === 200 && !!result.secret){
                    this.twofactor = result
                }
            }).catch((err)=>{
                if(err.status === 401){
                    router.push('login');
                }
            });
        }
    }

    // Message Component
    Vue.component('message', {
        props: ['messageData'],
        template: ` <div class="media-content">
                        <div class="content">
                            <p class="chatWindowMessage">
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
                            <input id="inputMessage" v-model="message" v-on:keydown.enter="send" class="input is-primary" placeholder="Write message">
                        </div>
                        <div class="control">
                            <button id="sendMsgButton" v-on:click="send" :disabled="!message" class="button is-primary">Send</button>
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
    const routes = [
        { path: '/cliechatview', component: ClieChatView },
        { path: '/login', component: Login },
        { path: '/otp', component: Otp },
        { path: '/setup', component: Setup }
    ];
    const router = new VueRouter({
        routes // short for `routes: routes`
    });
    var app = new Vue({
        el: '#app',
        router
    });
    socket.on('read-msg', function(message) {
        allMessages.push({ text: message.text, user: message.user, date: message.date });
    });
    socket.on('init-chat', function(messages) {
        allMessages = messages;
    });

})();