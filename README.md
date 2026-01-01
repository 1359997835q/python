# 电影网站系统

## 功能特性

- 电影上传和管理
- 视频自动剪辑：仅保留前6分钟内容
- 响应式设计，支持所有屏幕尺寸
- 卡密验证系统
- 前后端分离架构

## 技术栈

- **前端**：HTML5, CSS3, JavaScript, jQuery
- **后端**：Node.js (内置模块)
- **视频处理**：FFmpeg
- **数据存储**：JSON文件

## 视频剪辑功能

系统会自动将上传的视频剪辑为前6分钟，确保内容连贯流畅。

### 安装FFmpeg

为了使用视频剪辑功能，需要安装FFmpeg。以下是不同操作系统的安装方法：

#### Windows

1. 访问 [FFmpeg下载页面](https://ffmpeg.org/download.html#build-windows)
2. 下载Windows版本的FFmpeg
3. 解压文件到任意目录，例如 `C:\ffmpeg`
4. 将 `C:\ffmpeg\bin` 添加到系统环境变量 `PATH`
5. 重启命令提示符或终端

#### macOS

使用Homebrew安装：
```bash
brew install ffmpeg
```

#### Linux

使用apt安装：
```bash
sudo apt update
sudo apt install ffmpeg
```

### 验证安装

打开终端，输入以下命令验证FFmpeg是否安装成功：
```bash
ffmpeg -version
```

## 运行系统

### 启动服务器

```bash
node simple-server.js
```

服务器将在 http://localhost:3000 启动

### 访问页面

- **前台页面**：http://localhost:3000
- **后台管理**：http://localhost:3000/admin

## 视频剪辑原理

1. 用户上传视频文件
2. 系统先保存原始文件
3. 使用FFmpeg进行剪辑处理：
   - 高质量模式：使用H.264编码重新编码，确保剪辑流畅
   - 快速模式：直接复制流，适用于高质量模式失败时
4. 仅保留前6分钟内容
5. 更新电影列表和前端页面

## 故障排除

### 视频无法剪辑

1. 检查FFmpeg是否正确安装
2. 检查环境变量是否配置正确
3. 查看服务器日志，了解具体错误信息
4. 如果FFmpeg无法正常工作，系统会自动使用原始视频

### 视频播放问题

1. 确保视频格式受浏览器支持（推荐MP4格式）
2. 检查视频文件是否完整
3. 清除浏览器缓存

## 更新日志

### v1.0.0
- 初始版本发布
- 实现电影上传和管理
- 添加视频自动剪辑功能
- 支持卡密验证

## 许可证

MIT License
