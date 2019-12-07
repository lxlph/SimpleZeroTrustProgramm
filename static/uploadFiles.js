(function() {
    var socket = io('https://localhost:3000');
    Vue.component('upload-input', {
        template: '#upload-input',
        directives: {
            uploader: {
                bind(el, binding, vnode) {
                    el.addEventListener('change', e => {
                        if(e.target.files[0] !== undefined){
                            vnode.context.file = e.target.files[0];
                        }
                    });
                }
            },
        },
        watch: {
            file(val) {
                this.$emit('file-chosen', val);
            }
        },
        methods: {
            launchFilePicker() {
                this.$refs.file.click();
            }
        },
        data() {
            return {
                file: ''
            }
        }
    });

    Vue.component('progress-bar', {
        template: '#progress-bar',
        props: {
            progress: {
                default: 0,
                type: Number
            },
            showProgressText: {
                default: true,
                type: Boolean
            },
            progressCompleteText: {
                default: 'Complete!',
                type: String
            }
        },
        computed: {
            getProgress() {
                return Math.round(this.progress) + "%";
            }
        },
        watch: {
            progress(progress) {
                this.currentProgress = progress;
            }
        },
        data() {
            return {
                currentProgress: 0
            }
        }
    });

    new Vue({
        el: '#app',
        methods: {
            setFile(file) {
                this.file = file;
            },
            setFile2(file2) {
                this.file2 = file2;
            },
            cancelUpload() {
                this.request.abort();
            },
            uploadFile() {
                let formData = new FormData();
                formData.append('file', this.file);
                formData.append('file2', this.file2);
                this.uploading=true;
                this.uploadStatus = "";
                this.$http.post('/upload', formData, {
                    before: request => {
                        this.request = request;
                    },
                    progress: e => {
                        this.progress = (e.loaded / e.total) * 100;
                    }
                }).then(response => {
                    if(response.status === 206){
                        alert(response.body);
                    }
                    this.uploadStatus = "complete"
                    this.uploading = false;
                }, error => {
                    this.progress = 0;
                    this.uploading = false;
                    this.uploadStatus = "cancelled"
                });
            }
        },
        data: {
            file: '',
            file2: '',
            progress: 0,
            uploading:  false,
            uploadStatus: ''
        }
    });

})();