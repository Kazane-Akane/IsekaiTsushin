// 客户端应用
class ChatApp {
    constructor() {
        this.socket = null;
        this.currentUser = null;
        this.isReconnecting = false;
        this.reconnectInterval = 3000; // 3秒后重新连接
        
        // DOM元素
        this.loginPage = document.getElementById('loginPage');
        this.chatPage = document.getElementById('chatPage');
        this.usernameInput = document.getElementById('username');
        this.avatarOptions = document.querySelectorAll('.avatar-option');
        this.enterButton = document.getElementById('enterChat');
        this.userList = document.getElementById('userList');
        this.chatMessages = document.getElementById('chatMessages');
        this.messageInput = document.getElementById('messageInput');
        this.sendButton = document.getElementById('sendMessage');
        this.onlineCount = document.getElementById('onlineCount');
        
        this.selectedAvatar = '1'; // 默认头像
        
        // 新增的DOM元素和功能
        this.emojiButton = document.getElementById('emojiButton');
        this.emojiPanel = document.getElementById('emojiPanel');
        this.imageButton = document.getElementById('imageButton');
        this.videoButton = document.getElementById('videoButton');
        // 新增文件输入元素
        this.imageFileInput = document.getElementById('imageFileInput');
        this.videoFileInput = document.getElementById('videoFileInput');

        this.init();
    }
    
    init() {
        // 设置头像选择事件
        this.avatarOptions.forEach(option => {
            option.addEventListener('click', () => {
                this.avatarOptions.forEach(opt => opt.classList.remove('selected'));
                option.classList.add('selected');
                this.selectedAvatar = option.getAttribute('data-avatar');
            });
        });
        
        // 设置默认选中第一个头像
        this.avatarOptions[0].classList.add('selected');
        
        // 进入聊天室按钮事件
        this.enterButton.addEventListener('click', () => {
            this.enterChat();
        });
        
        // 回车键发送消息
        this.messageInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                this.sendMessage();
            }
        });
        
        // 发送按钮事件
        this.sendButton.addEventListener('click', () => {
            this.sendMessage();
        });

        // 表情按钮事件
        if (this.emojiButton) {
            this.emojiButton.addEventListener('click', () => {
                this.emojiPanel.classList.toggle('active');
            });
        }

        // 表情面板点击事件
        if (this.emojiPanel) {
            this.emojiPanel.addEventListener('click', (e) => {
                if (e.target.tagName === 'SPAN') {
                    const emojiCode = e.target.getAttribute('data-emoji');
                    this.messageInput.value += `[emoji:${emojiCode}]`;
                    this.messageInput.focus();
                }
            });
        }
        
        // 图片按钮事件 - 触发隐藏的文件输入框点击
        if (this.imageButton) {
            this.imageButton.addEventListener('click', () => {
                this.imageFileInput.click();
            });
        }

        // 视频按钮事件 - 触发隐藏的文件输入框点击
        if (this.videoButton) {
            this.videoButton.addEventListener('click', () => {
                this.videoFileInput.click();
            });
        }

        // 图片文件选择事件
        if (this.imageFileInput) {
            this.imageFileInput.addEventListener('change', (e) => {
                const file = e.target.files[0];
                if (file) {
                    const reader = new FileReader();
                    reader.onload = (event) => {
                        this.sendMessage('image', event.target.result);
                    };
                    reader.readAsDataURL(file);
                }
            });
        }

        // 视频文件选择事件
        if (this.videoFileInput) {
            this.videoFileInput.addEventListener('change', (e) => {
                const file = e.target.files[0];
                if (file) {
                    const reader = new FileReader();
                    reader.onload = (event) => {
                        this.sendMessage('video', event.target.result);
                    };
                    reader.readAsDataURL(file);
                }
            });
        }
    }
    
    enterChat() {
        if (this.isReconnecting) {
            return;
        }

        const username = this.usernameInput.value.trim();
        if (!username) {
            alert('Please enter your name');
            return;
        }
        if (username.length > 8) {
            alert('The username length is too long, please choose again!');
             return;
        }
        
        // 创建WebSocket连接
        this.socket = new WebSocket('wss://freechatroom.kazane.cloudns.club/');
        
        // 连接建立时
        this.socket.onopen = () => {
            console.log("WebSocket connected.");
            this.isReconnecting = false;
            // 发送加入聊天室请求
            const avatarUrl = this.getAvatarUrl(this.selectedAvatar);
            
            this.socket.send(JSON.stringify({
                type: 'join',
                name: username,
                avatar: avatarUrl
            }));

            // 切换到聊天界面
            this.loginPage.style.display = 'none';
            this.chatPage.style.display = 'flex';
        };
        
        // 接收消息
        this.socket.onmessage = (event) => {
            const data = JSON.parse(event.data);
            
            if (data.type === 'user_joined') {
                this.currentUser = data.user;
                this.updateUserList(data.users);
                this.addSystemMessage('ヰ世界通信へようこそ');
                this.addSystemMessage('ここでは、個人情報やチャットの履歴は一切残りません！');
                this.addSystemMessage('でも、覚えておいてください、見たものが真実とは限りません！');
            } else if (data.type === 'user_list') {
                this.updateUserList(data.users);
            } else if (data.type === 'new_message') {
                this.addUserMessageToUI(data.user, data.message);
            } else if (data.type === 'system_message') {
                this.addSystemMessage(data.message);
            } else if (data.type === 'user_left') {
                this.updateUserList(data.users);
                this.addSystemMessage(`${data.user.name} Leaving the Room`);
            }
        };
        
        // 错误处理和重新连接
        this.socket.onerror = (error) => {
            console.error('WebSocketError:', error);
            // 这里不显示alert，因为会不断弹窗
            // alert('Unable to connect to chat server, please make sure the server is started');
            this.reconnect();
        };

        // 连接关闭时重新连接
        this.socket.onclose = (event) => {
            console.log(`WebSocket closed with code ${event.code}, reason: ${event.reason}`);
            this.reconnect();
        };
    }

    reconnect() {
        if (this.isReconnecting) {
            return;
        }
        this.isReconnecting = true;
        console.log(`Attempting to reconnect in ${this.reconnectInterval / 1000} seconds...`);
        this.addSystemMessage(`The connection to the server has been lost. Attempting to reconnect...`);
        setTimeout(() => {
            this.isReconnecting = false;
            this.enterChat();
        }, this.reconnectInterval);
    }
    
            getAvatarUrl(avatarId) {
                const avatarUrls = {
                    '1': 'https://p1.music.126.net/cl_6SwF57UWPxOzbv2steg==/109951171936425135.jpg',
                    '2': 'https://p1.music.126.net/xNH-pTlvcRmh3U8WJS7JNQ==/109951171825877344.jpg',
                    '3': 'https://p1.music.126.net/PDsODg72ME1sJYAiLW5xDw==/109951170173411821.jpg',
                    '4': 'https://p1.music.126.net/hCIRndMWE4y9qMJ3xjaQsg==/109951170512328679.jpg',
                    '5': 'https://p1.music.126.net/XaeSAXURRaEe5OYAKoPtug==/109951169221164186.jpg',
                    '6': 'https://p1.music.126.net/JlpHimpMHKeTeeVU9XpzXQ==/109951170533289194.jpg',
                    '7': 'https://p1.music.126.net/Jb91HRHEIdMDv8SeK34YTw==/109951171933714711.jpg',
                    '8': 'https://p1.music.126.net/6P5L-GB2Dd_5JxVgWMHLiQ==/109951170514367223.jpg',
                    '9': 'https://p1.music.126.net/vPlsVKWVMkLQOeBFn6HCZw==/109951171315280436.jpg',
                    '10': 'https://p1.music.126.net/US1Ml1rhSTS2AneXsCoYyQ==/109951170921557573.jpg'
                };
                
                return avatarUrls[avatarId];
            }
    
    updateUserList(users) {
        this.userList.innerHTML = '';
        
        // 确保当前用户始终排在第一位
        const sortedUsers = [...users];
        if (this.currentUser) {
            const currentUserIndex = sortedUsers.findIndex(u => u.id === this.currentUser.id);
            if (currentUserIndex > -1) {
                const currentUserData = sortedUsers.splice(currentUserIndex, 1)[0];
                sortedUsers.unshift(currentUserData);
            }
        }

        sortedUsers.forEach(user => {
            const userElement = document.createElement('div');
            userElement.className = 'user-item';
            userElement.innerHTML = `
                <div class="user-avatar">
                    <img src="${user.avatar}" alt="${user.name}">
                </div>
                <div class="user-name">${user.name}</div>
            `;
            this.userList.appendChild(userElement);
        });
        
        this.onlineCount.textContent = users.length;
    }
    
    addSystemMessage(content) {
        const messageElement = document.createElement('div');
        messageElement.className = 'message message-system';
        messageElement.innerHTML = `
            <div class="message-content">${content}</div>

        `;
        this.chatMessages.appendChild(messageElement);
        this.scrollToBottom();
    }
    
    // 修改 sendMessage 函数，它现在接收类型和内容
    sendMessage(type = 'text', content = this.messageInput.value.trim()) {
        if (!content || !this.currentUser || this.socket.readyState !== WebSocket.OPEN) return;
        
        this.socket.send(JSON.stringify({
            type: 'message',
            messageType: type, // 直接使用传入的类型
            content: content
        }));
        
        this.messageInput.value = '';
        this.emojiPanel.classList.remove('active');
    }
    
    addUserMessageToUI(user, message) {
        const isCurrentUser = this.currentUser && user.id === this.currentUser.id;
        const messageElement = document.createElement('div');
        messageElement.className = `message ${isCurrentUser ? 'message-me' : 'message-user'}`;
        
        let messageContentHTML = '';
        if (message.messageType === 'image') {
            messageContentHTML = `<img src="${message.content}" alt="Image" class="message-image">`;
        } else if (message.messageType === 'video') {
            messageContentHTML = `<video src="${message.content}" controls class="message-video"></video>`;
        } else {
            messageContentHTML = this.formatMessageContent(message.content);
        }

        messageElement.innerHTML = `
            <div class="message-header">
                <div class="message-avatar">
                    <img src="${user.avatar}" alt="${user.name}">
                </div>
                <div class="message-info">
                <div class="message-sender">${user.name}</div>
                <div class="message-time">${this.formatTime(new Date(message.timestamp))}</div>
                 </div>
            </div>
            <div class="message-content">${messageContentHTML}</div>
            
        `;
        
        this.chatMessages.appendChild(messageElement);
        this.scrollToBottom();
    }
    
    formatMessageContent(content) {
        // 表情替换
        const emojiMap = {
            '1': '😂', '2': '😭', '3': '❤️', '4': '👍', '5': '🎉',
            '6': '🤔', '7': '😡', '8': '🤩', '9': '🙏', '10': '💯'
        };
        let formattedContent = content.replace(/\[emoji:(\d+)\]/g, (match, p1) => {
            return emojiMap[p1] || match;
        });

        // URL链接化
        const urlRegex = /(https?:\/\/[^\s]+)/g;
        formattedContent = formattedContent.replace(urlRegex, (url) => {
            return `<a href="${url}" target="_blank">${url}</a>`;
        });

        return formattedContent;
    }
    
    scrollToBottom() {
    setTimeout(() => {
    if (chatMessages) {
        this.chatMessages.scrollTop = this.chatMessages.scrollHeight;
        }
     }, 50);
     }
    
    formatTime(date) {
        return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    }
}

// 初始化应用
document.addEventListener('DOMContentLoaded', () => {
    new ChatApp();
});



