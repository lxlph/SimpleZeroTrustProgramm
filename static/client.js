/**
 *
 * code for the client page of the chatapp
 */

(function() {
    //load socket
    const socket = io('https://localhost:3000');
    //array of all messages
    let allMessages = [];

/*
    define some router-views as constants
*/
    const NotFound = { template: '<p>Page not found</p>' }
    const ClieChat = {
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
            //send new message to server
            sendMessage: function(message) {
                if (message) {
                    socket.emit('send-msg', { message: message, user: sessionStorage.email });
                }
            }
        },
        //start function
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
                user: sessionStorage.email,
                messages: []
            }
        },
    };
    const ClieChatReader = {
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
                                    </div>
                                </transition>
                            </div>
                        </div>
                    </div>
            `,
        //start function
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
                user: sessionStorage.email,
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
            //login with http.post
            login: function(email, password){
                sessionStorage.email = email;
                sessionStorage.password = password;
                this.$http.post('/login', { email: email, password: password}).then( response =>{
                    sessionStorage.email = email;
                    if(response.status === 206){
                        return router.push('otp');
                    } else if(response.status === 200) {
                        let verified = sessionStorage.verified;
                        sessionStorage.clear();
                        sessionStorage.email = email;
                        sessionStorage.loggedin = true;
                        sessionStorage.verified = verified;
                        return router.push('setup');
                    }
                }).catch(err => {
                    alert("Here: Invalid creds");
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
            //submit (otp code)
            login: function(otp){
                const options = {
                    headers: {
                        ['x-otp']: otp
                    }
                }
                const payload = {
                    email: sessionStorage.email,
                    password: sessionStorage.password
                }
                this.$http.post('/login', payload, options).then((response)=>{
                    if(response.status === 200){
                        let email = sessionStorage.email;
                        sessionStorage.clear();
                        sessionStorage.email = email;
                        sessionStorage.loggedin = true;
                        sessionStorage.verified = true;
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
                        <p><router-link to="/cliechat">Go to Chat</router-link></p>
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
                        sessionStorage.verified = true;
                        router.push("/cliechat");
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
                pageredirect: "",
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

/*
    define some components
*/
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

/*
    define routes and load them
*/
    const routes = [
        { path: '/cliechat', component: ClieChat },
        { path: '/cliechatreader', component: ClieChatReader },
        { path: '/login', component: Login },
        { path: '/otp', component: Otp },
        { path: '/setup', component: Setup }
    ];
    const router = new VueRouter({
        routes // short for `routes: routes`
    });

    //authorisation: before a router could be load, some conditions have to be checked
    router.beforeEach((to, from, next) => {
        if (to.fullPath === ('/cliechat'|| '/cliechatreader')) {
            if((sessionStorage.loggedin==="true"
                && sessionStorage.verified ==="true")
                && sessionStorage.email!==null ){
                if(sessionStorage.email === 'reader.only@gmail.com'){
                    next('/cliechatreader');
                }else{
                    next();
                }
            }
            else{
                alert("Please log in and verify with otp!");
                next('/login');
            }
        }
        else if(sessionStorage.loggedin==="true"){
            next();
        }
        else {
            if (to.fullPath === '/login') {
                next();
            }else {
                alert("Please login first");
                next('/login');
            }
        }
    });

/*
    start vue
*/
    new Vue({
        el: '#app',
        router,
    });

/*
    socket functions
*/
    //server has sent a new message, which should be pushed to the messages array
    socket.on('read-msg', function(message) {
        allMessages.push({ text: message.text, user: message.user, date: message.date });
    });
    //get all messages when the client starts
    socket.on('init-chat', function(messages) {
        allMessages = messages;
    });

})();