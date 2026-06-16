// 预加载脚本 - 安全桥接
const { contextBridge } = require('electron');
contextBridge.exposeInMainWorld('electronAPI', {
    platform: process.platform
});
